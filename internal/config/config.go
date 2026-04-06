package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/nemo1105/photo-manager/internal/commandtemplate"
	"github.com/nemo1105/photo-manager/internal/localize"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Keys           KeyConfig       `yaml:"keys" json:"keys"`
	Actions        []ActionBinding `yaml:"actions" json:"actions"`
	BrowserActions []ActionBinding `yaml:"browser_actions" json:"browserActions"`
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
	DeleteSel    string `yaml:"delete_selected" json:"deleteSelected"`
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
	Alias   string `yaml:"alias,omitempty" json:"alias,omitempty"`
}

type ValidationCode string

const (
	validationDuplicateField          ValidationCode = "duplicate_field"
	validationDuplicateActionKey      ValidationCode = "duplicate_action_key"
	validationActionConflictSlideshow ValidationCode = "action_conflicts_with_slideshow"
	validationActionConflictBrowser   ValidationCode = "action_conflicts_with_browser"
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
	case validationActionConflictBrowser:
		return fmt.Sprintf("action key %q conflicts with browser keys", e.Key)
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
	case validationActionConflictBrowser:
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s与文件夹浏览快捷键冲突。", label)
		}
		return fmt.Sprintf("%s conflicts with folder-browsing keys.", label)
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
	case errors.Is(e.Err, errInvalidBrowserAction):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s必须是移动。", label)
		}
		return fmt.Sprintf("%s must be move.", label)
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
	case errors.Is(e.Err, errInvalidCommandTemplate):
		detail := commandTemplateErrorDetail(e.Err)
		if locale == localize.ZHCN {
			if detail == "" {
				return fmt.Sprintf("%s模板无效。", label)
			}
			return fmt.Sprintf("%s模板无效：%s", label, detail)
		}
		if detail == "" {
			return fmt.Sprintf("%s has an invalid command template.", label)
		}
		return fmt.Sprintf("%s has an invalid command template: %s", label, detail)
	case errors.Is(e.Err, errMissingAlias):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s不能为空。", label)
		}
		return fmt.Sprintf("%s cannot be empty.", label)
	case errors.Is(e.Err, errUnexpectedAlias):
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s只适用于移动或执行命令动作。", label)
		}
		return fmt.Sprintf("%s is only used by move or command actions.", label)
	default:
		if locale == localize.ZHCN {
			return "配置无效。"
		}
		return "Configuration is invalid."
	}
}

var (
	errEmptyKey               = localize.NewStaticError("key cannot be empty", "按键不能为空")
	errInvalidKey             = localize.NewStaticError("key must be a single key", "按键必须是单个按键")
	errInvalidAction          = localize.NewStaticError("action must be move, delete, restore, or command", "动作必须是 move、delete、restore 或 command")
	errInvalidBrowserAction   = localize.NewStaticError("browser action must be move", "文件夹浏览动作必须是 move")
	errMissingTarget          = localize.NewStaticError("move action requires target", "move 动作需要目标路径")
	errMissingCommand         = localize.NewStaticError("command action requires command text", "command 动作需要命令行")
	errMissingAlias           = localize.NewStaticError("move or command action requires alias", "move 或 command 动作需要别名")
	errInvalidCommandTemplate = localize.NewStaticError("command template is invalid", "命令模板无效")
	errUnexpectedTarget       = localize.NewStaticError("only move actions can have target", "只有 move 动作可以包含目标路径")
	errUnexpectedCommand      = localize.NewStaticError("only command actions can have command text", "只有 command 动作可以包含命令行")
	errUnexpectedAlias        = localize.NewStaticError("only move or command actions can have alias", "只有 move 或 command 动作可以包含别名")
)

type validationOptions struct {
	allowLegacyMissingAlias bool
}

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
				DeleteSel:    "delete",
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
			{Key: "arrowdown", Action: "move", Target: "0", Alias: "0"},
			{Key: "arrowup", Action: "restore"},
		},
		BrowserActions: []ActionBinding{},
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
	if err := cfg.validateAndNormalize(validationOptions{allowLegacyMissingAlias: true}); err != nil {
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
	copyCfg.BrowserActions = append([]ActionBinding(nil), c.BrowserActions...)
	return &copyCfg
}

func (c *Config) ValidateAndNormalize() error {
	return c.validateAndNormalize(validationOptions{})
}

func (c *Config) validateAndNormalize(options validationOptions) error {
	if c == nil {
		return errors.New("config is nil")
	}

	c.migrateLegacyBrowserDeleteBinding()

	keyMaps := []struct {
		name string
		keys map[string]*string
	}{
		{
			name: "browser",
			keys: map[string]*string{
				"start_session":   &c.Keys.Browser.StartSession,
				"tree_up":         &c.Keys.Browser.TreeUp,
				"tree_down":       &c.Keys.Browser.TreeDown,
				"expand_dir":      &c.Keys.Browser.ExpandDir,
				"collapse_dir":    &c.Keys.Browser.CollapseDir,
				"delete_selected": &c.Keys.Browser.DeleteSel,
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

	if err := validateActionBindings(c.Actions, actionBindingValidation{
		prefix:                  "actions",
		allowLegacyMissingAlias: options.allowLegacyMissingAlias,
		invalidActionErr:        errInvalidAction,
		allowedActions: map[string]struct{}{
			"move":    {},
			"delete":  {},
			"restore": {},
			"command": {},
		},
	}); err != nil {
		return err
	}

	for i := range c.Actions {
		key := c.Actions[i].Key
		if key == c.Keys.Slideshow.Next ||
			key == c.Keys.Slideshow.Prev ||
			key == c.Keys.Slideshow.EndSession {
			return &ValidationError{
				Path: bindingValidationPath("actions", i, "key"),
				Code: validationActionConflictSlideshow,
				Key:  key,
			}
		}
	}

	if err := validateActionBindings(c.BrowserActions, actionBindingValidation{
		prefix:           "browser_actions",
		invalidActionErr: errInvalidBrowserAction,
		allowedActions: map[string]struct{}{
			"move": {},
		},
	}); err != nil {
		return err
	}

	for i := range c.BrowserActions {
		key := c.BrowserActions[i].Key
		if key == c.Keys.Browser.StartSession ||
			key == c.Keys.Browser.TreeUp ||
			key == c.Keys.Browser.TreeDown ||
			key == c.Keys.Browser.ExpandDir ||
			key == c.Keys.Browser.CollapseDir ||
			key == c.Keys.Browser.DeleteSel {
			return &ValidationError{
				Path: bindingValidationPath("browser_actions", i, "key"),
				Code: validationActionConflictBrowser,
				Key:  key,
			}
		}
	}

	return nil
}

type actionBindingValidation struct {
	prefix                  string
	allowLegacyMissingAlias bool
	invalidActionErr        error
	allowedActions          map[string]struct{}
}

func validateActionBindings(bindings []ActionBinding, options actionBindingValidation) error {
	actionKeys := map[string]int{}
	for i := range bindings {
		key, err := NormalizeKey(bindings[i].Key)
		if err != nil {
			return &ValidationError{
				Path: bindingValidationPath(options.prefix, i, "key"),
				Err:  err,
			}
		}
		bindings[i].Key = key
		bindings[i].Action = strings.ToLower(strings.TrimSpace(bindings[i].Action))
		bindings[i].Target = strings.TrimSpace(bindings[i].Target)
		bindings[i].Command = strings.TrimSpace(bindings[i].Command)
		bindings[i].Alias = strings.TrimSpace(bindings[i].Alias)

		if _, exists := actionKeys[key]; exists {
			return &ValidationError{
				Path: bindingValidationPath(options.prefix, i, "key"),
				Code: validationDuplicateActionKey,
			}
		}
		actionKeys[key] = i

		if _, ok := options.allowedActions[bindings[i].Action]; !ok {
			return &ValidationError{
				Path: bindingValidationPath(options.prefix, i, "action"),
				Err:  options.invalidActionErr,
			}
		}

		switch bindings[i].Action {
		case "move":
			if bindings[i].Target == "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "target"),
					Err:  errMissingTarget,
				}
			}
			if bindings[i].Alias == "" && !options.allowLegacyMissingAlias {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "alias"),
					Err:  errMissingAlias,
				}
			}
			if bindings[i].Command != "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "command"),
					Err:  errUnexpectedCommand,
				}
			}
		case "command":
			if bindings[i].Command == "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "command"),
					Err:  errMissingCommand,
				}
			}
			if err := commandtemplate.Validate(bindings[i].Command); err != nil {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "command"),
					Err:  fmt.Errorf("%w: %v", errInvalidCommandTemplate, err),
				}
			}
			if bindings[i].Alias == "" && !options.allowLegacyMissingAlias {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "alias"),
					Err:  errMissingAlias,
				}
			}
			if bindings[i].Target != "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "target"),
					Err:  errUnexpectedTarget,
				}
			}
		case "delete", "restore":
			if bindings[i].Target != "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "target"),
					Err:  errUnexpectedTarget,
				}
			}
			if bindings[i].Command != "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "command"),
					Err:  errUnexpectedCommand,
				}
			}
			if bindings[i].Alias != "" {
				return &ValidationError{
					Path: bindingValidationPath(options.prefix, i, "alias"),
					Err:  errUnexpectedAlias,
				}
			}
		}
	}
	return nil
}

func commandTemplateErrorDetail(err error) string {
	if err == nil || !errors.Is(err, errInvalidCommandTemplate) {
		return ""
	}
	detail := err.Error()
	prefix := errInvalidCommandTemplate.Error() + ": "
	if strings.HasPrefix(detail, prefix) {
		return strings.TrimSpace(detail[len(prefix):])
	}
	return ""
}

func (c *Config) migrateLegacyBrowserDeleteBinding() {
	if c == nil {
		return
	}

	deleteKey := strings.TrimSpace(c.Keys.Browser.DeleteSel)
	filtered := make([]ActionBinding, 0, len(c.BrowserActions))
	for _, binding := range c.BrowserActions {
		if strings.EqualFold(strings.TrimSpace(binding.Action), "delete") {
			if deleteKey == "" {
				deleteKey = strings.TrimSpace(binding.Key)
			}
			continue
		}
		filtered = append(filtered, binding)
	}
	if deleteKey == "" {
		deleteKey = "delete"
	}
	c.Keys.Browser.DeleteSel = deleteKey
	c.BrowserActions = filtered
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

func bindingValidationPath(prefix string, index int, field string) string {
	return fmt.Sprintf("%s[%d].%s", prefix, index, field)
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
	case "browser.delete_selected":
		return localizedLabel(locale, "Folder browsing delete folder key", "文件夹浏览删除文件夹快捷键")
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

	if label, ok := localizedIndexedBindingLabel(locale, path, "actions", false); ok {
		return label
	}
	if label, ok := localizedIndexedBindingLabel(locale, path, "browser_actions", true); ok {
		return label
	}

	return path
}

func localizedIndexedBindingLabel(locale localize.Locale, path, prefix string, browser bool) (string, bool) {
	startToken := prefix + "["
	if !strings.HasPrefix(path, startToken) {
		return "", false
	}
	closeIndex := strings.Index(path, "]")
	if closeIndex <= len(startToken) {
		return "", false
	}
	index, err := strconv.Atoi(path[len(startToken):closeIndex])
	if err != nil {
		return "", false
	}
	field := strings.TrimPrefix(path[closeIndex+1:], ".")
	return localizedActionLabel(locale, index, field, browser), true
}

func localizedActionLabel(locale localize.Locale, index int, field string, browser bool) string {
	number := index + 1
	enPrefix := "Action"
	zhPrefix := "动作"
	if browser {
		enPrefix = "Folder action"
		zhPrefix = "文件夹动作"
	}
	switch field {
	case "key":
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s %d 的按键", zhPrefix, number)
		}
		return fmt.Sprintf("%s %d key", enPrefix, number)
	case "action":
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s %d 的类型", zhPrefix, number)
		}
		return fmt.Sprintf("%s %d type", enPrefix, number)
	case "target":
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s %d 的目标路径", zhPrefix, number)
		}
		return fmt.Sprintf("%s %d target", enPrefix, number)
	case "command":
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s %d 的命令行", zhPrefix, number)
		}
		return fmt.Sprintf("%s %d command text", enPrefix, number)
	case "alias":
		if locale == localize.ZHCN {
			return fmt.Sprintf("%s %d 的别名", zhPrefix, number)
		}
		return fmt.Sprintf("%s %d alias", enPrefix, number)
	default:
		return fmt.Sprintf("%s[%d].%s", enPrefix, index, field)
	}
}

func localizedLabel(locale localize.Locale, en, zh string) string {
	if locale == localize.ZHCN {
		return zh
	}
	return en
}
