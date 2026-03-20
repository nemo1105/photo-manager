package config

import "testing"

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

	if cfg.Keys.Slideshow.Next != "arrowright" {
		t.Fatalf("expected slideshow next default to be arrowright, got %q", cfg.Keys.Slideshow.Next)
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
	if cfg.Actions[2].Key != "arrowup" || cfg.Actions[2].Action != "restore" {
		t.Fatalf("unexpected default restore action: %+v", cfg.Actions[2])
	}
}
