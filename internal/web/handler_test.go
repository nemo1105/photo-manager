package web

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/nemo1105/photo-manager/internal/app"
	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/localize"
	"github.com/nemo1105/photo-manager/internal/terminal"
)

type stubTrash struct{}

func (stubTrash) Trash(string) error {
	return nil
}

type deletingStubTrash struct {
	paths []string
}

func (d *deletingStubTrash) Trash(path string) error {
	d.paths = append(d.paths, path)
	return os.Remove(path)
}

type fakeHandlerTerminalManager struct {
	reserved []terminal.Spec
	session  terminal.Session
}

func (f *fakeHandlerTerminalManager) Reserve(spec terminal.Spec) (*terminal.Reservation, error) {
	f.reserved = append(f.reserved, spec)
	return &terminal.Reservation{
		ID:         "cmd-1",
		Command:    spec.Command,
		WorkDirRel: spec.WorkDirRel,
	}, nil
}

func (f *fakeHandlerTerminalManager) Attach(id string) (terminal.Session, error) {
	if id != "cmd-1" || f.session == nil {
		return nil, terminal.ErrSessionNotFound
	}
	return f.session, nil
}

type fakeHandlerTerminalSession struct {
	chunks       [][]byte
	readIndex    int
	readDone     chan struct{}
	readDoneOnce sync.Once
	resizes      [][2]int
	closed       bool
}

func newFakeHandlerTerminalSession(chunks ...string) *fakeHandlerTerminalSession {
	byteChunks := make([][]byte, 0, len(chunks))
	for _, chunk := range chunks {
		byteChunks = append(byteChunks, []byte(chunk))
	}
	return &fakeHandlerTerminalSession{
		chunks:   byteChunks,
		readDone: make(chan struct{}),
	}
}

func (f *fakeHandlerTerminalSession) ID() string {
	return "cmd-1"
}

func (f *fakeHandlerTerminalSession) Command() string {
	return "python script.py"
}

func (f *fakeHandlerTerminalSession) WorkDirRel() string {
	return "work"
}

func (f *fakeHandlerTerminalSession) Read(p []byte) (int, error) {
	if f.readIndex >= len(f.chunks) {
		f.markReadDone()
		return 0, io.EOF
	}
	chunk := f.chunks[f.readIndex]
	f.readIndex += 1
	copy(p, chunk)
	if f.readIndex >= len(f.chunks) {
		f.markReadDone()
	}
	return len(chunk), nil
}

func (f *fakeHandlerTerminalSession) Write(p []byte) (int, error) {
	return len(p), nil
}

func (f *fakeHandlerTerminalSession) Resize(cols, rows int) error {
	f.resizes = append(f.resizes, [2]int{cols, rows})
	return nil
}

func (f *fakeHandlerTerminalSession) Terminate() error {
	f.markReadDone()
	return nil
}

func (f *fakeHandlerTerminalSession) Wait(ctx context.Context) (int, error) {
	select {
	case <-f.readDone:
		return 0, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (f *fakeHandlerTerminalSession) Close() error {
	f.closed = true
	f.markReadDone()
	return nil
}

func (f *fakeHandlerTerminalSession) markReadDone() {
	f.readDoneOnce.Do(func() {
		close(f.readDone)
	})
}

type stagedHandlerTerminalSession struct {
	resizes         [][2]int
	waitReady       chan struct{}
	waitReadyOnce   sync.Once
	secondChunk     chan struct{}
	secondChunkOnce sync.Once
	readIndex       int
}

func newStagedHandlerTerminalSession() *stagedHandlerTerminalSession {
	return &stagedHandlerTerminalSession{
		waitReady:   make(chan struct{}),
		secondChunk: make(chan struct{}),
	}
}

func (s *stagedHandlerTerminalSession) ID() string {
	return "cmd-1"
}

func (s *stagedHandlerTerminalSession) Command() string {
	return "python script.py"
}

func (s *stagedHandlerTerminalSession) WorkDirRel() string {
	return "work"
}

func (s *stagedHandlerTerminalSession) Read(p []byte) (int, error) {
	switch s.readIndex {
	case 0:
		s.readIndex += 1
		s.waitReadyOnce.Do(func() {
			close(s.waitReady)
		})
		chunk := []byte("hello ")
		copy(p, chunk)
		return len(chunk), nil
	case 1:
		<-s.secondChunk
		s.readIndex += 1
		chunk := []byte("world\r\n")
		copy(p, chunk)
		return len(chunk), nil
	default:
		return 0, io.EOF
	}
}

func (s *stagedHandlerTerminalSession) Write(p []byte) (int, error) {
	return len(p), nil
}

func (s *stagedHandlerTerminalSession) Resize(cols, rows int) error {
	s.resizes = append(s.resizes, [2]int{cols, rows})
	return nil
}

func (s *stagedHandlerTerminalSession) Terminate() error {
	s.releaseSecondChunk()
	return nil
}

func (s *stagedHandlerTerminalSession) Wait(ctx context.Context) (int, error) {
	select {
	case <-s.waitReady:
		return 0, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (s *stagedHandlerTerminalSession) Close() error {
	s.releaseSecondChunk()
	return nil
}

func (s *stagedHandlerTerminalSession) releaseSecondChunk() {
	s.secondChunkOnce.Do(func() {
		close(s.secondChunk)
	})
}

type closeDrivenHandlerTerminalSession struct {
	readIndex     int
	waitReady     chan struct{}
	waitReadyOnce sync.Once
	closed        chan struct{}
	closeOnce     sync.Once
	closeReadErr  error
}

func newCloseDrivenHandlerTerminalSession() *closeDrivenHandlerTerminalSession {
	return newCloseDrivenHandlerTerminalSessionWithReadError(nil)
}

func newCloseDrivenHandlerTerminalSessionWithReadError(closeReadErr error) *closeDrivenHandlerTerminalSession {
	return &closeDrivenHandlerTerminalSession{
		waitReady:    make(chan struct{}),
		closed:       make(chan struct{}),
		closeReadErr: closeReadErr,
	}
}

func (s *closeDrivenHandlerTerminalSession) ID() string {
	return "cmd-1"
}

func (s *closeDrivenHandlerTerminalSession) Command() string {
	return "python script.py"
}

func (s *closeDrivenHandlerTerminalSession) WorkDirRel() string {
	return "work"
}

func (s *closeDrivenHandlerTerminalSession) Read(p []byte) (int, error) {
	switch s.readIndex {
	case 0:
		s.readIndex += 1
		s.waitReadyOnce.Do(func() {
			close(s.waitReady)
		})
		chunk := []byte("done\r\n")
		copy(p, chunk)
		return len(chunk), nil
	default:
		<-s.closed
		if s.closeReadErr != nil {
			return 0, s.closeReadErr
		}
		return 0, io.EOF
	}
}

func (s *closeDrivenHandlerTerminalSession) Write(p []byte) (int, error) {
	return len(p), nil
}

func (s *closeDrivenHandlerTerminalSession) Resize(cols, rows int) error {
	return nil
}

func (s *closeDrivenHandlerTerminalSession) Terminate() error {
	s.Close()
	return nil
}

func (s *closeDrivenHandlerTerminalSession) Wait(ctx context.Context) (int, error) {
	select {
	case <-s.waitReady:
		return 0, nil
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (s *closeDrivenHandlerTerminalSession) Close() error {
	s.closeOnce.Do(func() {
		close(s.closed)
	})
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
	if payload["error"] != "文件夹浏览开始整理快捷键不能为空。" {
		t.Fatalf("unexpected localized error: %q", payload["error"])
	}
}

func TestHandleConfigRequiresLocalizedMoveAlias(t *testing.T) {
	root := t.TempDir()
	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	reqCfg := config.Default()
	reqCfg.Actions[1].Alias = ""

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
	if payload["error"] != "动作 2 的别名不能为空。" {
		t.Fatalf("unexpected localized alias error: %q", payload["error"])
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
	if payload["error"] != "这个文件夹里没有可整理的图片" {
		t.Fatalf("unexpected fallback locale error: %q", payload["error"])
	}
}

func TestHandleActionWithoutSortingUsesUserLanguage(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodPost, "/api/action", bytes.NewBufferString(`{"currentPath":"work","imagePath":"work/a.jpg","actionKey":"delete"}`))
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
	if payload["error"] != "请先开始整理" {
		t.Fatalf("unexpected localized action error: %q", payload["error"])
	}
}

func TestHandleBrowserActionDeletesPhotoWithoutSession(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	trash := &deletingStubTrash{}
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), config.Default(), trash))

	req := httptest.NewRequest(http.MethodPost, "/api/browser/action", bytes.NewBufferString(`{"currentPath":"work","imagePath":"work/a.jpg","action":"delete"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Photo-Manager-Locale", "zh-CN")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	if len(trash.paths) != 1 || trash.paths[0] != filepath.Join(root, "work", "a.jpg") {
		t.Fatalf("unexpected trash calls: %+v", trash.paths)
	}
	if _, err := os.Stat(filepath.Join(root, "work", "a.jpg")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected deleted file to be gone, stat err=%v", err)
	}

	var payload struct {
		Notice string `json:"notice"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.Notice != "已将 a.jpg 移到回收站。" {
		t.Fatalf("unexpected localized delete notice: %q", payload.Notice)
	}
}

func TestHandleCommandStartReturnsReservation(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	manager := &fakeHandlerTerminalManager{}
	photoApp := app.NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}, manager)
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	handler := NewHandler(photoApp)

	req := httptest.NewRequest(http.MethodPost, "/api/command/start", bytes.NewBufferString(`{"currentPath":"work","imagePath":"work/a.jpg","actionKey":"c"}`))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	var payload struct {
		CommandSessionID string `json:"commandSessionId"`
		Command          string `json:"command"`
		Title            string `json:"title"`
		WorkingDir       string `json:"workingDir"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.CommandSessionID != "cmd-1" {
		t.Fatalf("expected session id cmd-1, got %q", payload.CommandSessionID)
	}
	if payload.WorkingDir != "work" {
		t.Fatalf("expected working dir work, got %q", payload.WorkingDir)
	}
	if payload.Title != "Python" {
		t.Fatalf("expected title Python, got %q", payload.Title)
	}
	if len(manager.reserved) != 1 || manager.reserved[0].WorkDirRel != "work" {
		t.Fatalf("unexpected reserved specs: %+v", manager.reserved)
	}
}

func TestHandleCommandWSStreamsOutputAndExit(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	session := newFakeHandlerTerminalSession("hello\r\n")
	manager := &fakeHandlerTerminalManager{session: session}
	photoApp := app.NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}, manager)
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := photoApp.StartCommandAction("work", "work/a.jpg", "c", localize.EN); err != nil {
		t.Fatalf("start command action: %v", err)
	}

	server := httptest.NewServer(NewHandler(photoApp))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/command/ws?id=cmd-1"
	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	var started map[string]any
	if err := wsjson.Read(ctx, conn, &started); err != nil {
		t.Fatalf("read started frame: %v", err)
	}
	if started["type"] != "started" {
		t.Fatalf("expected started frame, got %+v", started)
	}

	if err := wsjson.Write(ctx, conn, map[string]any{
		"type": "resize",
		"cols": 100,
		"rows": 40,
	}); err != nil {
		t.Fatalf("write resize frame: %v", err)
	}

	var output struct {
		Type string `json:"type"`
		Data string `json:"data"`
	}
	if err := wsjson.Read(ctx, conn, &output); err != nil {
		t.Fatalf("read output frame: %v", err)
	}
	if output.Type != "output" {
		t.Fatalf("expected output frame, got %+v", output)
	}
	data, err := base64.StdEncoding.DecodeString(output.Data)
	if err != nil {
		t.Fatalf("decode output: %v", err)
	}
	if string(data) != "hello\r\n" {
		t.Fatalf("unexpected output payload: %q", string(data))
	}

	var exit struct {
		Type string `json:"type"`
		Code int    `json:"code"`
	}
	if err := wsjson.Read(ctx, conn, &exit); err != nil {
		t.Fatalf("read exit frame: %v", err)
	}
	if exit.Type != "exit" || exit.Code != 0 {
		t.Fatalf("unexpected exit frame: %+v", exit)
	}

	deadline := time.Now().Add(250 * time.Millisecond)
	for len(session.resizes) == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if len(session.resizes) == 0 || session.resizes[0] != [2]int{100, 40} {
		t.Fatalf("expected resize 100x40, got %+v", session.resizes)
	}
}

func TestHandleCommandWSWaitsForOutputDrainBeforeExit(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	session := newStagedHandlerTerminalSession()
	manager := &fakeHandlerTerminalManager{session: session}
	photoApp := app.NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}, manager)
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := photoApp.StartCommandAction("work", "work/a.jpg", "c", localize.EN); err != nil {
		t.Fatalf("start command action: %v", err)
	}

	server := httptest.NewServer(NewHandler(photoApp))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/command/ws?id=cmd-1"
	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	var started map[string]any
	if err := wsjson.Read(ctx, conn, &started); err != nil {
		t.Fatalf("read started frame: %v", err)
	}
	if started["type"] != "started" {
		t.Fatalf("expected started frame, got %+v", started)
	}

	var first struct {
		Type string `json:"type"`
		Data string `json:"data"`
	}
	if err := wsjson.Read(ctx, conn, &first); err != nil {
		t.Fatalf("read first output frame: %v", err)
	}
	if first.Type != "output" {
		t.Fatalf("expected first output frame, got %+v", first)
	}
	firstBytes, err := base64.StdEncoding.DecodeString(first.Data)
	if err != nil {
		t.Fatalf("decode first output: %v", err)
	}
	if string(firstBytes) != "hello " {
		t.Fatalf("unexpected first output payload: %q", string(firstBytes))
	}

	time.Sleep(150 * time.Millisecond)
	session.releaseSecondChunk()

	var second struct {
		Type string `json:"type"`
		Data string `json:"data"`
	}
	if err := wsjson.Read(ctx, conn, &second); err != nil {
		t.Fatalf("read second output frame: %v", err)
	}
	if second.Type != "output" {
		t.Fatalf("expected second output frame, got %+v", second)
	}
	secondBytes, err := base64.StdEncoding.DecodeString(second.Data)
	if err != nil {
		t.Fatalf("decode second output: %v", err)
	}
	if string(secondBytes) != "world\r\n" {
		t.Fatalf("unexpected second output payload: %q", string(secondBytes))
	}

	var exit struct {
		Type string `json:"type"`
		Code int    `json:"code"`
	}
	if err := wsjson.Read(ctx, conn, &exit); err != nil {
		t.Fatalf("read exit frame: %v", err)
	}
	if exit.Type != "exit" || exit.Code != 0 {
		t.Fatalf("unexpected exit frame: %+v", exit)
	}
}

func TestHandleCommandWSSendsExitWhenCloseUnblocksRead(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	session := newCloseDrivenHandlerTerminalSession()
	manager := &fakeHandlerTerminalManager{session: session}
	photoApp := app.NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}, manager)
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := photoApp.StartCommandAction("work", "work/a.jpg", "c", localize.EN); err != nil {
		t.Fatalf("start command action: %v", err)
	}

	server := httptest.NewServer(NewHandler(photoApp))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/command/ws?id=cmd-1"
	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	var started map[string]any
	if err := wsjson.Read(ctx, conn, &started); err != nil {
		t.Fatalf("read started frame: %v", err)
	}
	if started["type"] != "started" {
		t.Fatalf("expected started frame, got %+v", started)
	}

	var output struct {
		Type string `json:"type"`
		Data string `json:"data"`
	}
	if err := wsjson.Read(ctx, conn, &output); err != nil {
		t.Fatalf("read output frame: %v", err)
	}
	if output.Type != "output" {
		t.Fatalf("expected output frame, got %+v", output)
	}
	data, err := base64.StdEncoding.DecodeString(output.Data)
	if err != nil {
		t.Fatalf("decode output: %v", err)
	}
	if string(data) != "done\r\n" {
		t.Fatalf("unexpected output payload: %q", string(data))
	}

	var exit struct {
		Type string `json:"type"`
		Code int    `json:"code"`
	}
	if err := wsjson.Read(ctx, conn, &exit); err != nil {
		t.Fatalf("read exit frame: %v", err)
	}
	if exit.Type != "exit" || exit.Code != 0 {
		t.Fatalf("unexpected exit frame: %+v", exit)
	}
}

func TestHandleCommandWSSuppressesBenignPipeEndedCloseError(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	session := newCloseDrivenHandlerTerminalSessionWithReadError(errors.New("The pipe has been ended."))
	manager := &fakeHandlerTerminalManager{session: session}
	photoApp := app.NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}, manager)
	if _, err := photoApp.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := photoApp.StartCommandAction("work", "work/a.jpg", "c", localize.EN); err != nil {
		t.Fatalf("start command action: %v", err)
	}

	server := httptest.NewServer(NewHandler(photoApp))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/api/command/ws?id=cmd-1"
	conn, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close(websocket.StatusNormalClosure, "")

	var started map[string]any
	if err := wsjson.Read(ctx, conn, &started); err != nil {
		t.Fatalf("read started frame: %v", err)
	}
	if started["type"] != "started" {
		t.Fatalf("expected started frame, got %+v", started)
	}

	var output struct {
		Type string `json:"type"`
		Data string `json:"data"`
	}
	if err := wsjson.Read(ctx, conn, &output); err != nil {
		t.Fatalf("read output frame: %v", err)
	}
	if output.Type != "output" {
		t.Fatalf("expected output frame, got %+v", output)
	}

	var exit struct {
		Type string `json:"type"`
		Code int    `json:"code"`
	}
	if err := wsjson.Read(ctx, conn, &exit); err != nil {
		t.Fatalf("read exit frame: %v", err)
	}
	if exit.Type != "exit" || exit.Code != 0 {
		t.Fatalf("unexpected exit frame: %+v", exit)
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

func TestHandleBrowserReturnsDirectoryCounts(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "work", "nested", "b.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "work", "nested", "deep", "c.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "skip.txt"))

	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodGet, "/api/browser?path=", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload struct {
		Directories []struct {
			Name                string `json:"name"`
			ImageCount          int    `json:"imageCount"`
			ImageCountEstimated bool   `json:"imageCountEstimated"`
		} `json:"directories"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}

	if len(payload.Directories) != 1 {
		t.Fatalf("expected one directory, got %+v", payload.Directories)
	}
	if payload.Directories[0].Name != "work" {
		t.Fatalf("expected directory work, got %+v", payload.Directories[0])
	}
	if payload.Directories[0].ImageCount != 3 || payload.Directories[0].ImageCountEstimated {
		t.Fatalf("unexpected directory count payload: %+v", payload.Directories[0])
	}
}

func TestHandleTreeReturnsCurrentNodeCounts(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteHandlerFile(t, filepath.Join(root, "work", "nested", "b.jpg"))

	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodGet, "/api/tree?path=work", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var payload struct {
		CurrentPath                string `json:"currentPath"`
		CurrentImageCount          int    `json:"currentImageCount"`
		CurrentImageCountEstimated bool   `json:"currentImageCountEstimated"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.CurrentPath != "work" {
		t.Fatalf("expected currentPath work, got %q", payload.CurrentPath)
	}
	if payload.CurrentImageCount != 2 || payload.CurrentImageCountEstimated {
		t.Fatalf("unexpected tree count payload: %+v", payload)
	}
}

func TestHandleBrowserAndTreeReturnDirectoryDecorations(t *testing.T) {
	root := t.TempDir()
	mustWriteHandlerFile(t, filepath.Join(root, "work", "done.txt"))

	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	browserReq := httptest.NewRequest(http.MethodGet, "/api/browser?path=", nil)
	browserReq.Header.Set("X-Photo-Manager-Locale", string(localize.EN))
	browserRec := httptest.NewRecorder()
	handler.ServeHTTP(browserRec, browserReq)

	if browserRec.Code != http.StatusOK {
		t.Fatalf("expected browser 200, got %d", browserRec.Code)
	}

	var browserPayload struct {
		Directories []struct {
			Name        string `json:"name"`
			Decorations []struct {
				ID      string `json:"id"`
				Tooltip string `json:"tooltip"`
			} `json:"decorations"`
		} `json:"directories"`
	}
	if err := json.Unmarshal(browserRec.Body.Bytes(), &browserPayload); err != nil {
		t.Fatalf("decode browser payload: %v", err)
	}
	if len(browserPayload.Directories) != 1 {
		t.Fatalf("expected one browser directory, got %+v", browserPayload.Directories)
	}
	if browserPayload.Directories[0].Name != "work" {
		t.Fatalf("expected work directory, got %+v", browserPayload.Directories[0])
	}
	if got := browserPayload.Directories[0].Decorations; len(got) != 1 || got[0].ID != "done-marker" || got[0].Tooltip != "Marked done by done.txt" {
		t.Fatalf("unexpected browser decorations: %+v", got)
	}

	treeReq := httptest.NewRequest(http.MethodGet, "/api/tree?path=work", nil)
	treeReq.Header.Set("X-Photo-Manager-Locale", string(localize.ZHCN))
	treeRec := httptest.NewRecorder()
	handler.ServeHTTP(treeRec, treeReq)

	if treeRec.Code != http.StatusOK {
		t.Fatalf("expected tree 200, got %d", treeRec.Code)
	}

	var treePayload struct {
		CurrentDecorations []struct {
			ID      string `json:"id"`
			Tooltip string `json:"tooltip"`
		} `json:"currentDecorations"`
	}
	if err := json.Unmarshal(treeRec.Body.Bytes(), &treePayload); err != nil {
		t.Fatalf("decode tree payload: %v", err)
	}
	if got := treePayload.CurrentDecorations; len(got) != 1 || got[0].ID != "done-marker" || got[0].Tooltip != "已由 done.txt 标记为完成" {
		t.Fatalf("unexpected tree decorations: %+v", got)
	}
}

func TestHandleBrowserStatsRouteIsRemoved(t *testing.T) {
	root := t.TempDir()
	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodGet, "/api/browser/stats?path=../outside", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestHandleStaticModuleAsset(t *testing.T) {
	root := t.TempDir()
	cfg := config.Default()
	handler := NewHandler(app.New(root, filepath.Join(root, "config.yaml"), cfg, stubTrash{}))

	req := httptest.NewRequest(http.MethodGet, "/app/vendor/addon-fit.mjs", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if contentType := rec.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "text/javascript") {
		t.Fatalf("expected javascript content type, got %q", contentType)
	}
	if !bytes.Contains(rec.Body.Bytes(), []byte("FitAddon")) {
		t.Fatalf("unexpected module body: %s", rec.Body.String())
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
