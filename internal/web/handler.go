package web

import (
	"embed"
	"encoding/json"
	"errors"
	"io/fs"
	"net/http"

	"github.com/nemo1105/photo-manager/internal/app"
	"github.com/nemo1105/photo-manager/internal/config"
)

//go:embed static/*
var assets embed.FS

type Handler struct {
	app        *app.App
	staticFS   http.Handler
	indexBytes []byte
}

func NewHandler(photoApp *app.App) http.Handler {
	staticSub, err := fs.Sub(assets, "static")
	if err != nil {
		panic(err)
	}
	indexBytes, err := fs.ReadFile(staticSub, "index.html")
	if err != nil {
		panic(err)
	}

	h := &Handler{
		app:        photoApp,
		staticFS:   http.FileServer(http.FS(staticSub)),
		indexBytes: indexBytes,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", h.handleIndex)
	mux.Handle("/app.js", h.staticFS)
	mux.Handle("/styles.css", h.staticFS)
	mux.HandleFunc("/api/browser", h.handleBrowser)
	mux.HandleFunc("/api/tree", h.handleTree)
	mux.HandleFunc("/api/session/start", h.handleSessionStart)
	mux.HandleFunc("/api/session/end", h.handleSessionEnd)
	mux.HandleFunc("/api/slideshow", h.handleSlideshow)
	mux.HandleFunc("/api/action", h.handleAction)
	mux.HandleFunc("/api/config", h.handleConfig)
	mux.HandleFunc("/image", h.handleImage)
	return mux
}

func (h *Handler) handleIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(h.indexBytes)
}

func (h *Handler) handleBrowser(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	data, err := h.app.Browser(r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) handleTree(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	data, err := h.app.Tree(r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) handleSessionStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var req struct {
		Path string `json:"path"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, err)
		return
	}
	result, err := h.app.OpenSession(req.Path)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) handleSessionEnd(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"session": h.app.EndSession(),
	})
}

func (h *Handler) handleSlideshow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	data, err := h.app.Slideshow(r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) handleAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var req struct {
		CurrentPath string `json:"currentPath"`
		ImagePath   string `json:"imagePath"`
		ActionKey   string `json:"actionKey"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, err)
		return
	}
	result, err := h.app.PerformAction(req.CurrentPath, req.ImagePath, req.ActionKey)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, h.app.GetConfig())
	case http.MethodPost:
		var req config.Config
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, err)
			return
		}
		cfg, err := h.app.SaveConfig(&req)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, cfg)
	default:
		methodNotAllowed(w)
	}
}

func (h *Handler) handleImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	path, err := h.app.ImagePath(r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, err)
		return
	}
	http.ServeFile(w, r, path)
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	if errors.Is(err, fs.ErrNotExist) {
		status = http.StatusNotFound
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func methodNotAllowed(w http.ResponseWriter) {
	w.WriteHeader(http.StatusMethodNotAllowed)
}
