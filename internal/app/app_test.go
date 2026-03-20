package app

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/nemo1105/photo-manager/internal/config"
)

type fakeTrash struct {
	paths []string
}

func (f *fakeTrash) Trash(path string) error {
	f.paths = append(f.paths, path)
	return os.Remove(path)
}

func TestMoveAndRestoreUseSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "photo.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession(""); err != nil {
		t.Fatalf("open session: %v", err)
	}

	if _, err := app.PerformAction("", "photo.jpg", "arrowdown"); err != nil {
		t.Fatalf("move photo: %v", err)
	}

	movedPath := filepath.Join(root, "0", "photo.jpg")
	if _, err := os.Stat(movedPath); err != nil {
		t.Fatalf("expected moved file: %v", err)
	}

	if _, err := app.PerformAction("0", "0/photo.jpg", "arrowup"); err != nil {
		t.Fatalf("restore photo: %v", err)
	}

	if _, err := os.Stat(filepath.Join(root, "photo.jpg")); err != nil {
		t.Fatalf("expected restored file in session root: %v", err)
	}
}

func TestBrowserAutoEndsSessionOutsideRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteFile(t, filepath.Join(root, "other", "b.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	data, err := app.Browser("other")
	if err != nil {
		t.Fatalf("browse other: %v", err)
	}

	if data.Session.Active {
		t.Fatal("expected session to be ended automatically")
	}
	if data.Notice == "" {
		t.Fatal("expected auto-end notice")
	}
}

func TestTreeLookupOutsideSessionDoesNotEndSession(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteFile(t, filepath.Join(root, "other", "nested", "b.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	data, err := app.Tree("other")
	if err != nil {
		t.Fatalf("tree other: %v", err)
	}
	if len(data.Directories) != 1 || data.Directories[0].Name != "nested" {
		t.Fatalf("unexpected tree payload: %+v", data.Directories)
	}
	if !app.sessionInfoLocked().Active {
		t.Fatal("expected tree lookup to keep the session active")
	}
}

func TestMoveAutoRenamesOnConflict(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "photo.jpg"))
	mustWriteFile(t, filepath.Join(root, "0", "photo.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession(""); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := app.PerformAction("", "photo.jpg", "arrowdown"); err != nil {
		t.Fatalf("move photo: %v", err)
	}

	if _, err := os.Stat(filepath.Join(root, "0", "photo (1).jpg")); err != nil {
		t.Fatalf("expected renamed target: %v", err)
	}
}

func mustWriteFile(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
