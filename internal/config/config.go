package config

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

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
	EndSession   string `yaml:"end_session" json:"endSession"`
	TreeUp       string `yaml:"tree_up" json:"treeUp"`
	TreeDown     string `yaml:"tree_down" json:"treeDown"`
	ExpandDir    string `yaml:"expand_dir" json:"expandDir"`
	CollapseDir  string `yaml:"collapse_dir" json:"collapseDir"`
	UpDir        string `yaml:"up_dir" json:"upDir"`
	OpenSettings string `yaml:"open_settings" json:"openSettings"`
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
	Key    string `yaml:"key" json:"key"`
	Action string `yaml:"action" json:"action"`
	Target string `yaml:"target,omitempty" json:"target,omitempty"`
}

var (
	errEmptyKey         = errors.New("key cannot be empty")
	errInvalidKey       = errors.New("key must be a single key")
	errInvalidAction    = errors.New("action must be move, delete, or restore")
	errMissingTarget    = errors.New("move action requires target")
	errUnexpectedTarget = errors.New("delete and restore actions cannot have target")
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
				EndSession:   "q",
				TreeUp:       "arrowup",
				TreeDown:     "arrowdown",
				ExpandDir:    "arrowright",
				CollapseDir:  "arrowleft",
				UpDir:        "backspace",
				OpenSettings: "s",
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
				"end_session":   &c.Keys.Browser.EndSession,
				"tree_up":       &c.Keys.Browser.TreeUp,
				"tree_down":     &c.Keys.Browser.TreeDown,
				"expand_dir":    &c.Keys.Browser.ExpandDir,
				"collapse_dir":  &c.Keys.Browser.CollapseDir,
				"up_dir":        &c.Keys.Browser.UpDir,
				"open_settings": &c.Keys.Browser.OpenSettings,
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
				return fmt.Errorf("%s.%s: %w", group.name, field, err)
			}
			if other, exists := seen[key]; exists {
				return fmt.Errorf("%s.%s duplicates %s", group.name, field, other)
			}
			seen[key] = field
			*ptr = key
		}
	}

	actionKeys := map[string]int{}
	for i := range c.Actions {
		key, err := NormalizeKey(c.Actions[i].Key)
		if err != nil {
			return fmt.Errorf("actions[%d].key: %w", i, err)
		}
		c.Actions[i].Key = key
		c.Actions[i].Action = strings.ToLower(strings.TrimSpace(c.Actions[i].Action))
		c.Actions[i].Target = strings.TrimSpace(c.Actions[i].Target)

		if _, exists := actionKeys[key]; exists {
			return fmt.Errorf("actions[%d].key duplicates another action", i)
		}
		actionKeys[key] = i

		switch c.Actions[i].Action {
		case "move":
			if c.Actions[i].Target == "" {
				return fmt.Errorf("actions[%d]: %w", i, errMissingTarget)
			}
		case "delete", "restore":
			if c.Actions[i].Target != "" {
				return fmt.Errorf("actions[%d]: %w", i, errUnexpectedTarget)
			}
		default:
			return fmt.Errorf("actions[%d]: %w", i, errInvalidAction)
		}
	}

	for key := range actionKeys {
		if key == c.Keys.Slideshow.Next ||
			key == c.Keys.Slideshow.Prev ||
			key == c.Keys.Slideshow.EndSession {
			return fmt.Errorf("action key %q conflicts with slideshow keys", key)
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
	if _, ok := namedKeys[key]; ok {
		return key, nil
	}
	if utf8.RuneCountInString(key) != 1 {
		return "", errInvalidKey
	}
	return key, nil
}
