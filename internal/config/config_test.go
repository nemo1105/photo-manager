package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateAndNormalizeRejectsSlideshowActionConflict(t *testing.T) {
	cfg := Default()
	cfg.Actions[0].Key = cfg.Keys.Slideshow.Next

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected conflict error")
	}
}

func TestValidateAndNormalizeNormalizesNamedKeys(t *testing.T) {
	cfg := Default()
	cfg.Keys.Browser.StartSession = "Space"
	cfg.Keys.Preview.Close = "EscApe"
	cfg.Actions[0].Key = "Delete"
	cfg.Actions[1].Key = "ArrowDown"
	cfg.Actions[2].Key = "ArrowUp"

	if err := cfg.ValidateAndNormalize(); err != nil {
		t.Fatalf("validate config: %v", err)
	}

	if cfg.Keys.Browser.StartSession != "space" {
		t.Fatalf("expected normalized space, got %q", cfg.Keys.Browser.StartSession)
	}
	if cfg.Keys.Preview.Close != "escape" {
		t.Fatalf("expected normalized escape, got %q", cfg.Keys.Preview.Close)
	}
	if cfg.Actions[0].Key != "delete" {
		t.Fatalf("expected normalized delete, got %q", cfg.Actions[0].Key)
	}
	if cfg.Actions[1].Key != "arrowdown" {
		t.Fatalf("expected normalized arrowdown, got %q", cfg.Actions[1].Key)
	}
	if cfg.Actions[2].Key != "arrowup" {
		t.Fatalf("expected normalized arrowup, got %q", cfg.Actions[2].Key)
	}
}

func TestDefaultUsesUpdatedSlideshowAndActionKeys(t *testing.T) {
	cfg := Default()

	if cfg.Keys.Browser.TreeUp != "arrowup" {
		t.Fatalf("expected browser tree-up default to be arrowup, got %q", cfg.Keys.Browser.TreeUp)
	}
	if cfg.Keys.Browser.TreeDown != "arrowdown" {
		t.Fatalf("expected browser tree-down default to be arrowdown, got %q", cfg.Keys.Browser.TreeDown)
	}
	if cfg.Keys.Browser.ExpandDir != "arrowright" {
		t.Fatalf("expected browser expand-dir default to be arrowright, got %q", cfg.Keys.Browser.ExpandDir)
	}
	if cfg.Keys.Browser.CollapseDir != "arrowleft" {
		t.Fatalf("expected browser collapse-dir default to be arrowleft, got %q", cfg.Keys.Browser.CollapseDir)
	}
	if cfg.Keys.Browser.DeleteSel != "delete" {
		t.Fatalf("expected browser delete-selected default to be delete, got %q", cfg.Keys.Browser.DeleteSel)
	}
	if cfg.Keys.Slideshow.Next != "arrowright" {
		t.Fatalf("expected slideshow next default to be arrowright, got %q", cfg.Keys.Slideshow.Next)
	}
	if cfg.Keys.Slideshow.Prev != "arrowleft" {
		t.Fatalf("expected slideshow prev default to be arrowleft, got %q", cfg.Keys.Slideshow.Prev)
	}
	if cfg.Keys.Slideshow.EndSession != "space" {
		t.Fatalf("expected slideshow end-session default to be space, got %q", cfg.Keys.Slideshow.EndSession)
	}
	if len(cfg.Actions) != 3 {
		t.Fatalf("expected 3 default actions, got %d", len(cfg.Actions))
	}
	if cfg.Actions[0].Key != "delete" || cfg.Actions[0].Action != "delete" {
		t.Fatalf("unexpected default delete action: %+v", cfg.Actions[0])
	}
	if cfg.Actions[1].Key != "arrowdown" || cfg.Actions[1].Target != "0" {
		t.Fatalf("unexpected default move action: %+v", cfg.Actions[1])
	}
	if cfg.Actions[1].Alias != "0" {
		t.Fatalf("expected default move alias to be 0, got %+v", cfg.Actions[1])
	}
	if cfg.Actions[2].Key != "arrowup" || cfg.Actions[2].Action != "restore" {
		t.Fatalf("unexpected default restore action: %+v", cfg.Actions[2])
	}
	if len(cfg.BrowserActions) != 0 {
		t.Fatalf("expected no default browser actions, got %d", len(cfg.BrowserActions))
	}
}

func TestValidateAndNormalizeAllowsEscapeAsActionKey(t *testing.T) {
	cfg := Default()
	cfg.Actions[0].Key = "escape"

	if err := cfg.ValidateAndNormalize(); err != nil {
		t.Fatalf("expected escape action key to be allowed, got %v", err)
	}
}

func TestValidateAndNormalizeAllowsCommandActions(t *testing.T) {
	cfg := Default()
	cfg.Actions = append(cfg.Actions, ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py {{ shell .CurrentFile }}",
		Alias:   "Python",
	})

	if err := cfg.ValidateAndNormalize(); err != nil {
		t.Fatalf("expected command action to validate, got %v", err)
	}

	if cfg.Actions[3].Command != "python script.py {{ shell .CurrentFile }}" {
		t.Fatalf("expected command text to remain, got %q", cfg.Actions[3].Command)
	}
	if cfg.Actions[3].Alias != "Python" {
		t.Fatalf("expected alias to remain, got %q", cfg.Actions[3].Alias)
	}
}

func TestValidateAndNormalizeRejectsLegacyCurrentFilePlaceholder(t *testing.T) {
	cfg := Default()
	cfg.Actions = append(cfg.Actions, ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py {{currentFile}}",
		Alias:   "Python",
	})

	err := cfg.ValidateAndNormalize()
	if err == nil {
		t.Fatal("expected legacy placeholder to be rejected")
	}

	validationErr, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("expected validation error, got %T", err)
	}
	if validationErr.Path != "actions[3].command" {
		t.Fatalf("expected invalid command path, got %q", validationErr.Path)
	}
}

func TestValidateAndNormalizeRejectsUnknownCommandTemplateField(t *testing.T) {
	cfg := Default()
	cfg.Actions = append(cfg.Actions, ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py {{ .CurrentDir }}",
		Alias:   "Python",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected invalid command template to be rejected")
	}
}

func TestValidateAndNormalizeAllowsBrowserMoveActions(t *testing.T) {
	cfg := Default()
	cfg.BrowserActions = append(cfg.BrowserActions, ActionBinding{
		Key:    "m",
		Action: "move",
		Target: "0",
		Alias:  "Inbox",
	})

	if err := cfg.ValidateAndNormalize(); err != nil {
		t.Fatalf("expected browser move action to validate, got %v", err)
	}
}

func TestValidateAndNormalizeRejectsUnsupportedBrowserActionType(t *testing.T) {
	cfg := Default()
	cfg.BrowserActions = append(cfg.BrowserActions, ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected unsupported browser action type to fail")
	}
}

func TestValidateAndNormalizeRejectsBrowserActionConflict(t *testing.T) {
	cfg := Default()
	cfg.BrowserActions = append(cfg.BrowserActions, ActionBinding{
		Key:    cfg.Keys.Browser.TreeUp,
		Action: "move",
		Target: "0",
		Alias:  "Inbox",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected browser action/browser key conflict")
	}
}

func TestValidateAndNormalizeRejectsBrowserActionConflictWithDeleteSelected(t *testing.T) {
	cfg := Default()
	cfg.BrowserActions = append(cfg.BrowserActions, ActionBinding{
		Key:    cfg.Keys.Browser.DeleteSel,
		Action: "move",
		Target: "0",
		Alias:  "Inbox",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected browser action/delete-selected conflict")
	}
}

func TestLoadMigratesLegacyBrowserDeleteActionToDeleteSelected(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "config.yaml")
	data := []byte(`
keys:
  browser:
    start_session: space
    tree_up: arrowup
    tree_down: arrowdown
    expand_dir: arrowright
    collapse_dir: arrowleft
  preview:
    close: escape
    next: arrowright
    prev: arrowleft
  slideshow:
    next: arrowright
    prev: arrowleft
    end_session: space
actions:
  - key: delete
    action: delete
  - key: arrowdown
    action: move
    target: 0
    alias: Inbox
  - key: arrowup
    action: restore
browser_actions:
  - key: x
    action: delete
  - key: m
    action: move
    target: 0
    alias: Inbox
`)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	if cfg.Keys.Browser.DeleteSel != "x" {
		t.Fatalf("expected migrated browser delete key x, got %q", cfg.Keys.Browser.DeleteSel)
	}
	if len(cfg.BrowserActions) != 1 || cfg.BrowserActions[0].Action != "move" {
		t.Fatalf("expected only browser move actions after migration, got %+v", cfg.BrowserActions)
	}
	if err := Save(path, cfg); err != nil {
		t.Fatalf("save migrated config: %v", err)
	}
	saved, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read saved config: %v", err)
	}
	if !strings.Contains(string(saved), "delete_selected: x") {
		t.Fatalf("expected delete_selected to be saved, got:\n%s", string(saved))
	}
	if strings.Contains(string(saved), "- key: x\n      action: delete") {
		t.Fatalf("expected legacy browser delete action to be dropped, got:\n%s", string(saved))
	}
}

func TestValidateAndNormalizeRejectsCommandWithoutText(t *testing.T) {
	cfg := Default()
	cfg.Actions = append(cfg.Actions, ActionBinding{
		Key:    "c",
		Action: "command",
		Alias:  "Python",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected missing command text error")
	}
}

func TestValidateAndNormalizeRejectsCommandActionWithTarget(t *testing.T) {
	cfg := Default()
	cfg.Actions = append(cfg.Actions, ActionBinding{
		Key:     "c",
		Action:  "command",
		Target:  "0",
		Command: "python script.py",
		Alias:   "Python",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected command target error")
	}
}

func TestValidateAndNormalizeRejectsCommandWithoutAlias(t *testing.T) {
	cfg := Default()
	cfg.Actions = append(cfg.Actions, ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
	})

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected missing alias error")
	}
}

func TestValidateAndNormalizeRejectsMoveWithoutAlias(t *testing.T) {
	cfg := Default()
	cfg.Actions[1].Alias = ""

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected move alias to be required")
	}
}

func TestValidateAndNormalizeRejectsAliasOnDeleteAction(t *testing.T) {
	cfg := Default()
	cfg.Actions[0].Alias = "Delete"

	if err := cfg.ValidateAndNormalize(); err == nil {
		t.Fatal("expected alias to be rejected on delete action")
	}
}

func TestLoadIgnoresLegacyBrowserEndSessionBrowserUpDirBrowserOpenSettingsAndSlideshowBackToBrowserFields(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "config.yaml")
	data := []byte(`
keys:
  browser:
    start_session: space
    end_session: q
    tree_up: arrowup
    tree_down: arrowdown
    expand_dir: arrowright
    collapse_dir: arrowleft
    up_dir: backspace
    open_settings: s
  preview:
    close: escape
    next: arrowright
    prev: arrowleft
  slideshow:
    next: arrowright
    prev: arrowleft
    back_to_browser: escape
    end_session: space
actions:
  - key: delete
    action: delete
  - key: arrowdown
    action: move
    target: 0
  - key: arrowup
    action: restore
  - key: c
    action: command
    command: python script.py
`)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}

	if cfg.Keys.Slideshow.EndSession != "space" {
		t.Fatalf("expected slideshow end-session to load, got %q", cfg.Keys.Slideshow.EndSession)
	}
	if cfg.Keys.Browser.TreeUp != "arrowup" {
		t.Fatalf("expected browser tree-up to load, got %q", cfg.Keys.Browser.TreeUp)
	}
	if cfg.Actions[0].Key != "delete" {
		t.Fatalf("expected actions to load, got %+v", cfg.Actions)
	}
	if len(cfg.Actions) != 4 {
		t.Fatalf("expected legacy command action to load, got %+v", cfg.Actions)
	}
	if cfg.Actions[1].Alias != "" {
		t.Fatalf("expected legacy move alias to stay empty on load, got %q", cfg.Actions[1].Alias)
	}
	if cfg.Actions[3].Alias != "" {
		t.Fatalf("expected legacy command alias to stay empty on load, got %q", cfg.Actions[3].Alias)
	}

	if err := Save(path, cfg); err == nil {
		t.Fatal("expected save to reject legacy move/command actions without alias")
	}
}

func TestSaveDropsLegacyFieldsAfterAddingAlias(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "config.yaml")
	data := []byte(`
keys:
  browser:
    start_session: space
    end_session: q
    tree_up: arrowup
    tree_down: arrowdown
    expand_dir: arrowright
    collapse_dir: arrowleft
    up_dir: backspace
    open_settings: s
  preview:
    close: escape
    next: arrowright
    prev: arrowleft
  slideshow:
    next: arrowright
    prev: arrowleft
    back_to_browser: escape
    end_session: space
actions:
  - key: delete
    action: delete
  - key: arrowdown
    action: move
    target: 0
  - key: arrowup
    action: restore
  - key: c
    action: command
    command: python script.py
`)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	cfg, err := Load(path)
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	cfg.Actions[1].Alias = "Inbox"
	cfg.Actions[3].Alias = "Python"

	if err := Save(path, cfg); err != nil {
		t.Fatalf("save config: %v", err)
	}

	saved, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read saved config: %v", err)
	}
	if strings.Contains(string(saved), "end_session: q") {
		t.Fatalf("expected legacy browser end-session field to be dropped, got:\n%s", string(saved))
	}
	if strings.Contains(string(saved), "back_to_browser:") {
		t.Fatalf("expected legacy slideshow back-to-browser field to be dropped, got:\n%s", string(saved))
	}
	if strings.Contains(string(saved), "up_dir:") {
		t.Fatalf("expected legacy browser up-dir field to be dropped, got:\n%s", string(saved))
	}
	if strings.Contains(string(saved), "open_settings:") {
		t.Fatalf("expected legacy browser open-settings field to be dropped, got:\n%s", string(saved))
	}
	if !strings.Contains(string(saved), "alias: Python") {
		t.Fatalf("expected alias to be saved, got:\n%s", string(saved))
	}
	if !strings.Contains(string(saved), "alias: Inbox") {
		t.Fatalf("expected move alias to be saved, got:\n%s", string(saved))
	}
}
