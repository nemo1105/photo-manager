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

	if err := cfg.ValidateAndNormalize(); err != nil {
		t.Fatalf("validate config: %v", err)
	}

	if cfg.Keys.Browser.StartSession != "space" {
		t.Fatalf("expected normalized space, got %q", cfg.Keys.Browser.StartSession)
	}
	if cfg.Keys.Preview.Close != "escape" {
		t.Fatalf("expected normalized escape, got %q", cfg.Keys.Preview.Close)
	}
}
