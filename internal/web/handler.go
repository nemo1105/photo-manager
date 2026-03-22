package web

import (
	"context"
	"embed"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/nemo1105/photo-manager/internal/app"
	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/localize"
	"github.com/nemo1105/photo-manager/internal/terminal"
)

//go:embed static/*
var assets embed.FS

var errInvalidRequest = localize.NewStaticError("invalid request body", "请求体无效")

func init() {
	mime.AddExtensionType(".mjs", "text/javascript; charset=utf-8")
}

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
	mux.Handle("/app/", h.staticFS)
	mux.Handle("/styles.css", h.staticFS)
	mux.Handle("/styles/", h.staticFS)
	mux.HandleFunc("/api/browser", h.handleBrowser)
	mux.HandleFunc("/api/browser/action", h.handleBrowserAction)
	mux.HandleFunc("/api/tree", h.handleTree)
	mux.HandleFunc("/api/session/start", h.handleSessionStart)
	mux.HandleFunc("/api/session/end", h.handleSessionEnd)
	mux.HandleFunc("/api/slideshow", h.handleSlideshow)
	mux.HandleFunc("/api/action", h.handleAction)
	mux.HandleFunc("/api/command/start", h.handleCommandStart)
	mux.HandleFunc("/api/command/ws", h.handleCommandWS)
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
	locale := localize.FromRequest(r)
	data, err := h.app.Browser(r.URL.Query().Get("path"), locale)
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *Handler) handleBrowserAction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		methodNotAllowed(w)
		return
	}
	var req struct {
		CurrentPath string `json:"currentPath"`
		ImagePath   string `json:"imagePath"`
		Action      string `json:"action"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, r, err)
		return
	}
	result, err := h.app.PerformBrowserImageAction(req.CurrentPath, req.ImagePath, req.Action, localize.FromRequest(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) handleTree(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}
	data, err := h.app.Tree(r.URL.Query().Get("path"))
	if err != nil {
		writeError(w, r, err)
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
		writeError(w, r, err)
		return
	}
	result, err := h.app.OpenSession(req.Path)
	if err != nil {
		writeError(w, r, err)
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
	locale := localize.FromRequest(r)
	data, err := h.app.Slideshow(r.URL.Query().Get("path"), locale)
	if err != nil {
		writeError(w, r, err)
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
		writeError(w, r, err)
		return
	}
	result, err := h.app.PerformAction(req.CurrentPath, req.ImagePath, req.ActionKey, localize.FromRequest(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) handleCommandStart(w http.ResponseWriter, r *http.Request) {
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
		writeError(w, r, err)
		return
	}
	result, err := h.app.StartCommandAction(req.CurrentPath, req.ImagePath, req.ActionKey, localize.FromRequest(r))
	if err != nil {
		writeError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) handleCommandWS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		methodNotAllowed(w)
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	session, err := h.app.AttachCommandSession(r.URL.Query().Get("id"))
	if err != nil {
		status := websocket.StatusInternalError
		if errors.Is(err, terminal.ErrSessionNotFound) || errors.Is(err, terminal.ErrSessionAttached) {
			status = websocket.StatusPolicyViolation
		}
		_ = conn.Close(status, "command session unavailable")
		return
	}
	defer session.Close()

	writer := &commandFrameWriter{
		ctx:  r.Context(),
		conn: conn,
	}

	_ = writer.Write(commandWSMessage{Type: "started"})

	outputDone := make(chan struct{})
	go func() {
		streamCommandOutput(r.Context(), writer, session)
		close(outputDone)
	}()
	go waitCommandExit(writer, session, outputDone)

	if err := readCommandControl(r.Context(), conn, session); err != nil {
		status := websocket.CloseStatus(err)
		if status == websocket.StatusNormalClosure || status == websocket.StatusGoingAway {
			return
		}
		if errors.Is(err, context.Canceled) {
			return
		}
		log.Printf("command websocket closed: %v", err)
	}
}

func (h *Handler) handleConfig(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, h.app.GetConfig())
	case http.MethodPost:
		var req config.Config
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, r, err)
			return
		}
		cfg, err := h.app.SaveConfig(&req)
		if err != nil {
			writeError(w, r, err)
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
		writeError(w, r, err)
		return
	}
	http.ServeFile(w, r, path)
}

func decodeJSON(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errInvalidRequest
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	locale := localize.FromRequest(r)
	status := http.StatusBadRequest
	message := ""

	var userErr localize.UserMessager
	switch {
	case errors.Is(err, fs.ErrNotExist):
		status = http.StatusNotFound
		message = localize.NotFound(locale)
	case errors.As(err, &userErr):
		message = userErr.UserMessage(locale)
	default:
		status = http.StatusInternalServerError
		message = localize.UnexpectedError(locale)
		log.Printf("request failed: %v", err)
	}

	writeJSON(w, status, map[string]string{"error": message})
}

func methodNotAllowed(w http.ResponseWriter) {
	w.WriteHeader(http.StatusMethodNotAllowed)
}

type commandWSControl struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Cols int    `json:"cols,omitempty"`
	Rows int    `json:"rows,omitempty"`
}

type commandWSMessage struct {
	Type    string `json:"type"`
	Data    string `json:"data,omitempty"`
	Code    int    `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

type commandFrameWriter struct {
	ctx  context.Context
	conn *websocket.Conn
	mu   sync.Mutex
}

func (w *commandFrameWriter) Write(message commandWSMessage) error {
	w.mu.Lock()
	defer w.mu.Unlock()

	ctx, cancel := context.WithTimeout(w.ctx, 5*time.Second)
	defer cancel()
	return wsjson.Write(ctx, w.conn, message)
}

func streamCommandOutput(ctx context.Context, writer *commandFrameWriter, session terminal.Session) {
	buf := make([]byte, 4096)
	for {
		n, err := session.Read(buf)
		if n > 0 {
			payload := base64.StdEncoding.EncodeToString(buf[:n])
			if writeErr := writer.Write(commandWSMessage{
				Type: "output",
				Data: payload,
			}); writeErr != nil {
				return
			}
		}
		if err != nil {
			if !isBenignCommandStreamError(err) {
				_ = writer.Write(commandWSMessage{
					Type:    "error",
					Message: err.Error(),
				})
			}
			return
		}
		select {
		case <-ctx.Done():
			return
		default:
		}
	}
}

func isBenignCommandStreamError(err error) bool {
	if err == nil || errors.Is(err, io.EOF) || errors.Is(err, context.Canceled) {
		return true
	}

	message := strings.ToLower(err.Error())
	return strings.Contains(message, "file has already been closed") ||
		strings.Contains(message, "pipe has been ended") ||
		strings.Contains(message, "broken pipe") ||
		strings.Contains(message, "handle is invalid")
}

func waitCommandExit(writer *commandFrameWriter, session terminal.Session, outputDone <-chan struct{}) {
	code, err := session.Wait(context.Background())
	_ = session.Close()
	<-outputDone
	if err != nil {
		_ = writer.Write(commandWSMessage{
			Type:    "error",
			Message: err.Error(),
		})
		return
	}
	_ = writer.Write(commandWSMessage{
		Type: "exit",
		Code: code,
	})
}

func readCommandControl(ctx context.Context, conn *websocket.Conn, session terminal.Session) error {
	for {
		var message commandWSControl
		if err := wsjson.Read(ctx, conn, &message); err != nil {
			return err
		}

		switch message.Type {
		case "input":
			if message.Data == "" {
				continue
			}
			if _, err := session.Write([]byte(message.Data)); err != nil {
				return err
			}
		case "resize":
			if err := session.Resize(message.Cols, message.Rows); err != nil {
				return err
			}
		case "terminate":
			if err := session.Terminate(); err != nil {
				return err
			}
		}
	}
}
