package main

import (
	"errors"
	"flag"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestResolveLaunchRootDefaultsToWorkingDirectory(t *testing.T) {
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}

	got, err := resolveLaunchRoot(nil)
	if err != nil {
		t.Fatalf("resolve launch root: %v", err)
	}
	if got != wd {
		t.Fatalf("expected %q, got %q", wd, got)
	}
}

func TestResolveLaunchRootUsesDirFlag(t *testing.T) {
	root := t.TempDir()
	relative := filepath.Base(root)
	parent := filepath.Dir(root)

	prev, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(parent); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(prev)
	})

	got, err := resolveLaunchRoot([]string{"-dir", relative})
	if err != nil {
		t.Fatalf("resolve launch root: %v", err)
	}
	if got != root {
		t.Fatalf("expected %q, got %q", root, got)
	}
}

func TestResolveLaunchRootRejectsMissingDirectory(t *testing.T) {
	_, err := resolveLaunchRoot([]string{"-dir", filepath.Join(t.TempDir(), "missing")})
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "stat launch directory") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestResolveLaunchRootRejectsFiles(t *testing.T) {
	root := t.TempDir()
	file := filepath.Join(root, "image.jpg")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	_, err := resolveLaunchRoot([]string{"-dir", file})
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "is not a directory") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestResolveLaunchRootHelp(t *testing.T) {
	_, err := resolveLaunchRoot([]string{"-h"})
	if !errors.Is(err, flag.ErrHelp) {
		t.Fatalf("expected flag.ErrHelp, got %v", err)
	}
}

func TestResolveLaunchRootRejectsPositionalArgs(t *testing.T) {
	_, err := resolveLaunchRoot([]string{"photos"})
	if err == nil {
		t.Fatal("expected error")
	}
	if !strings.Contains(err.Error(), "unexpected arguments") {
		t.Fatalf("unexpected error: %v", err)
	}
}
