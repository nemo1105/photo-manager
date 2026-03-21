package web

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/nemo1105/photo-manager/internal/app"
	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/localize"
)

type stubTrash struct{}

func (stubTrash) Trash(string) error {
	return nil
}

func TestHandleConfigReturnsLocalizedValidationError(t *testing.T) {
	root := t.TempDir()
	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	reqCfg := config.Default()
	reqCfg.Keys.Browser.StartSession = ""

	body, err := json.Marshal(reqCfg)
	if err != nil {
		t.Fatalf("marshal config: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/config", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Photo-Manager-Locale", "zh-CN")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}

	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload["error"] != "浏览模式开始会话快捷键不能为空。" {
		t.Fatalf("unexpected localized error: %q", payload["error"])
	}
}

func TestHandleSessionStartUsesAcceptLanguageFallback(t *testing.T) {
	root := t.TempDir()
	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodPost, "/api/session/start", bytes.NewBufferString(`{"path":""}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept-Language", "zh-CN,zh;q=0.9")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}

	var payload map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload["error"] != "当前文件夹没有图片" {
		t.Fatalf("unexpected fallback locale error: %q", payload["error"])
	}
}

func TestHandleBrowserEndsActiveSession(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	photoApp := app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{})
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	handler := NewHandler(photoApp)

	req := httptest.NewRequest(http.MethodGet, "/api/browser?path=work", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload struct {
		Session struct {
			Active bool `json:"active"`
		} `json:"session"`
		Notice string `json:"notice"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Session.Active {
		t.Fatal("expected browser load to clear the active session")
	}
	if payload.Notice != "" {
		t.Fatalf("expected browser load to end session silently, got %q", payload.Notice)
	}
}

func TestHandleBrowserOmitsLegacyParentNavigationFields(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodGet, "/api/browser?path=work", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload map[string]json.RawMessage
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if _, exists := payload["parentPath"]; exists {
		t.Fatalf("expected browser payload to omit legacy parentPath field, got %s", rec.Body.String())
	}
	if _, exists := payload["canGoUp"]; exists {
		t.Fatalf("expected browser payload to omit legacy canGoUp field, got %s", rec.Body.String())
	}
}

func TestHandleBrowserStatsReturnsRecursiveCountsWithoutEndingSession(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "other", "nested", "b.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "other", ".hidden", "skip.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "other", "notes.txt"))

	cfg := config.Default()
	photoApp := app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{})
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	handler := NewHandler(photoApp)

	req := httptest.NewRequest(http.MethodGet, "/api/browser/stats?path=other", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload struct {
		CurrentPath         string `json:"currentPath"`
		DirectoryCount      int    `json:"directoryCount"`
		ImageCount          int    `json:"imageCount"`
		RecursiveImageCount int    `json:"recursiveImageCount"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.CurrentPath != "other" {
		t.Fatalf("expected currentPath other, got %q", payload.CurrentPath)
	}
	if payload.DirectoryCount != 1 || payload.ImageCount != 0 || payload.RecursiveImageCount != 1 {
		t.Fatalf("unexpected stats payload: %+v", payload)
	}

	slideshow, err := photoApp.Slideshow("work", localize.EN)
	if err != nil {
		t.Fatalf("slideshow after stats: %v", err)
	}
	if !slideshow.Session.Active {
		t.Fatal("expected stats lookup not to end the session")
	}
}

func TestHandleBrowserStatsRejectsEscapingPaths(t *testing.T) {
	root := t.TempDir()
	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodGet, "/api/browser/stats?path=../outside", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func mustWriteHandlerFile(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
