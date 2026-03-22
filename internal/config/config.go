package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/nemo1105/photo-manager/internal/localize"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Keys    KeyConfig       `yaml:"keys" json:"keys"`
	Actions []ActionBinding `yaml:"actions" json:"actions"`
}

type KeyConfig struct {
	Browser   BrowserKeys   `yaml:"browser" json:"browser"`
	Preview   PreviewKeys   `yaml:"preview" json:"preview"`
	Slideshow SlideshowKeys `yaml:"slideshow" json:"slideshow"`
}

type BrowserKeys struct {
	StartSession string `yaml:"start_session" json:"startSession"`
	TreeUp       string `yaml:"tree_up" json:"treeUp"`
	TreeDown     string `yaml:"tree_down" json:"treeDown"`
	ExpandDir    string `yaml:"expand_dir" json:"expandDir"`
	CollapseDir  string `yaml:"collapse_dir" json:"collapseDir"`
}

type PreviewKeys struct {
	Close string `yaml:"close" json:"close"`
	Next  string `yaml:"next" json:"next"`
	Prev  string `yaml:"prev" json:"prev"`
}

type SlideshowKeys struct {
	Next       string `yaml:"next" json:"next"`
	Prev       string `yaml:"prev" json:"prev"`
	EndSession string `yaml:"end_session" json:"endSession"`
}

type ActionBinding struct {
	Key     string `yaml:"key" json:"key"`
	Action  string `yaml:"action" json:"action"`
	Target  string `yaml:"target,omitempty" json:"target,omitempty"`
	Command string `yaml:"command,omitempty" json:"command,omitempty"`
}

type ValidationCode string

const (
	validationDuplicateField          ValidationCode = "duplicate_field"
	validationDuplicateActionKey      ValidationCode = "duplicate_action_key"
	validationActionConflictSlideshow ValidationCode = "action_conflicts_with_slideshow"
)

type ValidationError struct {
	Path      string
	Code      ValidationCode
	OtherPath string
	Key       string
	Err       error
}

func (e *ValidationError) Error() string {
	if e == nil {
		return ""
	}
	switch e.Code {
	case validationDuplicateField:
		return fmt.Sprintf("%s duplicates %s", e.Path, e.OtherPath)
	case validationDuplicateActionKey:
		return fmt.Sprintf("%s duplicates another action", e.Path)
	case validationActionConflictSlideshow:
		return fmt.Sprintf("action key %q conflicts with slideshow keys", e.Key)
	default:
		if e.Err == nil {
			return e.Path
		}
		return fmt.Sprintf("%s: %v", e.Path, e.Err)
	}
}

func (e *ValidationError) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Err
}

func (e *ValidationError) UserMessage(locale localize.Locale) string {
	if e == nil {
		return ""
	}
	label := validationFieldLabel(locale, e.Path)
	other := validationFieldLabel(locale, e.OtherPath)

	switch e.Code {
	case validationDuplicateField:
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s与%s重复。", label, other)
		}
		return fmt.Sprintf("%s duplicates %s.", label, other)
	case validationDuplicateActionKey:
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s与其他动作快捷键重复。", label)
		}
		return fmt.Sprintf("%s duplicates another action key.", label)
	case validationActionConflictSlideshow:
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s与整理界面切图快捷键冲突。", label)
		}
		return fmt.Sprintf("%s conflicts with sorting-view navigation keys.", label)
	}

	switch {
	case errors.Is(e.Err, errEmptyKey):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s不能为空。", label)
		}
		return fmt.Sprintf("%s cannot be empty.", label)
	case errors.Is(e.Err, errInvalidKey):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s必须是单个按键。", label)
		}
		return fmt.Sprintf("%s must be a single key.", label)
	case errors.Is(e.Err, errInvalidAction):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s必须是移动、删除、恢复或执行命令。", label)
		}
		return fmt.Sprintf("%s must be move, delete, restore, or command.", label)
	case errors.Is(e.Err, errMissingTarget):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s需要目标路径。", label)
		}
		return fmt.Sprintf("%s requires a target path.", label)
	case errors.Is(e.Err, errMissingCommand):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s需要命令行。", label)
		}
		return fmt.Sprintf("%s requires command text.", label)
	case errors.Is(e.Err, errUnexpectedTarget):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s只适用于移动动作。", label)
		}
		return fmt.Sprintf("%s is only used by move actions.", label)
	case errors.Is(e.Err, errUnexpectedCommand):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s只适用于执行命令动作。", label)
		}
		return fmt.Sprintf("%s is only used by command actions.", label)
	default:
		if locale == localize.ZHCN {
			return "配置无效。"
		}
		return "Configuration is invalid."
	}
}

var (
	errEmptyKey          = localize.NewStaticError("key cannot be empty", "按键不能为空")
	errInvalidKey        = localize.NewStaticError("key must be a single key", "按键必须是单个按键")
	errInvalidAction     = localize.NewStaticError("action must be move, delete, restore, or command", "动作必须是 move、delete、restore 或 command")
	errMissingTarget     = localize.NewStaticError("move action requires target", "move 动作需要目标路径")
	errMissingCommand    = localize.NewStaticError("command action requires command text", "command 动作需要命令行")
	errUnexpectedTarget  = localize.NewStaticError("only move actions can have target", "只有 move 动作可以包含目标路径")
	errUnexpectedCommand = localize.NewStaticError("only command actions can have command text", "只有 command 动作可以包含命令行")
)

var namedKeys = map[string]struct{}{
	"space":      {},
	"escape":     {},
	"arrowleft":  {},
	"arrowright": {},
	"arrowup":    {},
	"arrowdown":  {},
	"backspace":  {},
	"enter":      {},
	"tab":        {},
	"delete":     {},
}

func DefaultPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".photo-manager", "config.yaml"), nil
}

func Default() *Config {
	return &Config{
		Keys: KeyConfig{
			Browser: BrowserKeys{
				StartSession: "space",
				TreeUp:       "arrowup",
				TreeDown:     "arrowdown",
				ExpandDir:    "arrowright",
				CollapseDir:  "arrowleft",
			},
			Preview: PreviewKeys{
				Close: "escape",
				Next:  "arrowright",
				Prev:  "arrowleft",
			},
			Slideshow: SlideshowKeys{
				Next:       "arrowright",
				Prev:       "arrowleft",
				EndSession: "space",
			},
		},
		Actions: []ActionBinding{
			{Key: "delete", Action: "delete"},
			{Key: "arrowdown", Action: "move", Target: "0"},
			{Key: "arrowup", Action: "restore"},
		},
	}
}

func LoadOrInit(path string) (*Config, bool, error) {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		cfg := Default()
		if err := Save(path, cfg); err != nil {
			return nil, false, err
		}
		return cfg, true, nil
	} else if err != nil {
		return nil, false, err
	}

	cfg, err := Load(path)
	return cfg, false, err
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse yaml: %w", err)
	}
	if err := cfg.ValidateAndNormalize(); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func Save(path string, cfg *Config) error {
	copyCfg := cfg.Clone()
	if err := copyCfg.ValidateAndNormalize(); err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	data, err := yaml.Marshal(copyCfg)
	if err != nil {
		return err
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (c *Config) Clone() *Config {
	if c == nil {
		return Default()
	}
	copyCfg := *c
	copyCfg.Actions = append([]ActionBinding(nil), c.Actions...)
	return &copyCfg
}

func (c *Config) ValidateAndNormalize() error {
	if c == nil {
		return errors.New("config is nil")
	}

	keyMaps := []struct {
		name string
		keys map[string]*string
	}{
		{
			name: "browser",
			keys: map[string]*string{
				"start_session": &c.Keys.Browser.StartSession,
				"tree_up":       &c.Keys.Browser.TreeUp,
				"tree_down":     &c.Keys.Browser.TreeDown,
				"expand_dir":    &c.Keys.Browser.ExpandDir,
				"collapse_dir":  &c.Keys.Browser.CollapseDir,
			},
		},
		{
			name: "preview",
			keys: map[string]*string{
				"close": &c.Keys.Preview.Close,
				"next":  &c.Keys.Preview.Next,
				"prev":  &c.Keys.Preview.Prev,
			},
		},
		{
			name: "slideshow",
			keys: map[string]*string{
				"next":        &c.Keys.Slideshow.Next,
				"prev":        &c.Keys.Slideshow.Prev,
				"end_session": &c.Keys.Slideshow.EndSession,
			},
		},
	}

	for _, group := range keyMaps {
		seen := map[string]string{}
		for field, ptr := range group.keys {
			key, err := NormalizeKey(*ptr)
			if err != nil {
				return &ValidationError{
					Path: validationPath(group.name, field),
					Err:  err,
				}
			}
			if other, exists := seen[key]; exists {
				return &ValidationError{
					Path:      validationPath(group.name, field),
					Code:      validationDuplicateField,
					OtherPath: validationPath(group.name, other),
				}
			}
			seen[key] = field
			*ptr = key
		}
	}

	actionKeys := map[string]int{}
	for i := range c.Actions {
		key, err := NormalizeKey(c.Actions[i].Key)
		if err != nil {
			return &ValidationError{
				Path: actionValidationPath(i, "key"),
				Err:  err,
			}
		}
		c.Actions[i].Key = key
		c.Actions[i].Action = strings.ToLower(strings.TrimSpace(c.Actions[i].Action))
		c.Actions[i].Target = strings.TrimSpace(c.Actions[i].Target)
		c.Actions[i].Command = strings.TrimSpace(c.Actions[i].Command)

		if _, exists := actionKeys[key]; exists {
			return &ValidationError{
				Path: actionValidationPath(i, "key"),
				Code: validationDuplicateActionKey,
			}
		}
		actionKeys[key] = i

		switch c.Actions[i].Action {
		case "move":
			if c.Actions[i].Target == "" {
				return &ValidationError{
					Path: actionValidationPath(i, "target"),
					Err:  errMissingTarget,
				}
			}
			if c.Actions[i].Command != "" {
				return &ValidationError{
					Path: actionValidationPath(i, "command"),
					Err:  errUnexpectedCommand,
				}
			}
		case "command":
			if c.Actions[i].Command == "" {
				return &ValidationError{
					Path: actionValidationPath(i, "command"),
					Err:  errMissingCommand,
				}
			}
			if c.Actions[i].Target != "" {
				return &ValidationError{
					Path: actionValidationPath(i, "target"),
					Err:  errUnexpectedTarget,
				}
			}
		case "delete", "restore":
			if c.Actions[i].Target != "" {
				return &ValidationError{
					Path: actionValidationPath(i, "target"),
					Err:  errUnexpectedTarget,
				}
			}
			if c.Actions[i].Command != "" {
				return &ValidationError{
					Path: actionValidationPath(i, "command"),
					Err:  errUnexpectedCommand,
				}
			}
		default:
			return &ValidationError{
				Path: actionValidationPath(i, "action"),
				Err:  errInvalidAction,
			}
		}
	}

	for i := range c.Actions {
		key := c.Actions[i].Key
		if key == c.Keys.Slideshow.Next ||
			key == c.Keys.Slideshow.Prev ||
			key == c.Keys.Slideshow.EndSession {
			return &ValidationError{
				Path: actionValidationPath(i, "key"),
				Code: validationActionConflictSlideshow,
				Key:  key,
			}
		}
	}

	return nil
}

func NormalizeKey(key string) (string, error) {
	key = strings.TrimSpace(strings.ToLower(key))
	if key == "" {
		return "", errEmptyKey
	}
	if key == " " {
		return "space", nil
	}
	if key == "esc" {
		return "escape", nil
	}
	if _, ok := namedKeys[key]; ok {
		return key, nil
	}
	if utf8.RuneCountInString(key) != 1 {
		return "", errInvalidKey
	}
	return key, nil
}

func validationPath(group, field string) string {
	return group + "." + field
}

func actionValidationPath(index int, field string) string {
	return fmt.Sprintf("actions[%d].%s", index, field)
}

func validationFieldLabel(locale localize.Locale, path string) string {
	switch path {
	case "browser.start_session":
		return localizedLabel(locale, "Folder browsing start sorting key", "文件夹浏览开始整理快捷键")
	case "browser.tree_up":
		return localizedLabel(locale, "Folder browsing previous folder key", "文件夹浏览上一个文件夹快捷键")
	case "browser.tree_down":
		return localizedLabel(locale, "Folder browsing next folder key", "文件夹浏览下一个文件夹快捷键")
	case "browser.expand_dir":
		return localizedLabel(locale, "Folder browsing expand folder key", "文件夹浏览展开文件夹快捷键")
	case "browser.collapse_dir":
		return localizedLabel(locale, "Folder browsing collapse or parent key", "文件夹浏览折叠/返回父级快捷键")
	case "preview.close":
		return localizedLabel(locale, "Preview close key", "预览关闭快捷键")
	case "preview.next":
		return localizedLabel(locale, "Preview next photo key", "预览下一张图片快捷键")
	case "preview.prev":
		return localizedLabel(locale, "Preview previous photo key", "预览上一张图片快捷键")
	case "slideshow.next":
		return localizedLabel(locale, "Sorting view next photo key", "整理界面下一张图片快捷键")
	case "slideshow.prev":
		return localizedLabel(locale, "Sorting view previous photo key", "整理界面上一张图片快捷键")
	case "slideshow.end_session":
		return localizedLabel(locale, "Sorting view exit key", "整理界面退出整理快捷键")
	}

	if strings.HasPrefix(path, "actions[") {
		closeIndex := strings.Index(path, "]")
		if closeIndex > len("actions[") {
			index, err := strconv.Atoi(path[len("actions["):closeIndex])
			if err == nil {
				switch strings.TrimPrefix(path[closeIndex+1:], ".") {
				case "key":
					return localizedActionLabel(locale, index, "key")
				case "action":
					return localizedActionLabel(locale, index, "action")
				case "target":
					return localizedActionLabel(locale, index, "target")
				case "command":
					return localizedActionLabel(locale, index, "command")
				}
			}
		}
	}

	return path
}

func localizedActionLabel(locale localize.Locale, index int, field string) string {
	number := index + 1
	switch field {
	case "key":
		if locale == localize.ZHCN {
			return fmt.Sprintf("动作 %d 的按键", number)
		}
		return fmt.Sprintf("Action %d key", number)
	case "action":
		if locale == localize.ZHCN {
			return fmt.Sprintf("动作 %d 的类型", number)
		}
		return fmt.Sprintf("Action %d type", number)
	case "target":
		if locale == localize.ZHCN {
			return fmt.Sprintf("动作 %d 的目标路径", number)
		}
		return fmt.Sprintf("Action %d target", number)
	case "command":
		if locale == localize.ZHCN {
			return fmt.Sprintf("动作 %d 的命令行", number)
		}
		return fmt.Sprintf("Action %d command text", number)
	default:
		return fmt.Sprintf("actions[%d].%s", index, field)
	}
}

func localizedLabel(locale localize.Locale, en, zh string) string {
	if locale == localize.ZHCN {
		return zh
	}
	return en
}
