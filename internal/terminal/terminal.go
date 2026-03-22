package terminal

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
)

const (
	defaultCols = 120
	defaultRows = 30
)

var (
	ErrSessionActive   = errors.New("terminal session already active")
	ErrSessionNotFound = errors.New("terminal session not found")
	ErrSessionAttached = errors.New("terminal session already attached")
)

type Spec struct {
	Command    string
	WorkDirAbs string
	WorkDirRel string
	Env        []string
}

type Reservation struct {
	ID         string
	Command    string
	WorkDirRel string
}

type Session interface {
	ID() string
	Command() string
	WorkDirRel() string
	Read([]byte) (int, error)
	Write([]byte) (int, error)
	Resize(cols, rows int) error
	Terminate() error
	Wait(ctx context.Context) (int, error)
	Close() error
}

type Manager interface {
	Reserve(spec Spec) (*Reservation, error)
	Attach(id string) (Session, error)
}

type SystemManager struct {
	mu     sync.Mutex
	active *managedSession
}

type managedSession struct {
	manager   *SystemManager
	id        string
	spec      Spec
	proc      process
	attached  bool
	done      chan struct{}
	waitErr   error
	exitCode  int
	closeOnce sync.Once
	waitOnce  sync.Once
	stateMu   sync.Mutex
}

func NewSystemManager() Manager {
	return &SystemManager{}
}

func (m *SystemManager) Reserve(spec Spec) (*Reservation, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.active != nil {
		return nil, ErrSessionActive
	}

	id, err := newSessionID()
	if err != nil {
		return nil, err
	}

	m.active = &managedSession{
		manager: m,
		id:      id,
		spec:    spec,
		done:    make(chan struct{}),
	}

	return &Reservation{
		ID:         id,
		Command:    spec.Command,
		WorkDirRel: spec.WorkDirRel,
	}, nil
}

func (m *SystemManager) Attach(id string) (Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.active == nil || m.active.id != id {
		return nil, ErrSessionNotFound
	}
	if m.active.attached {
		return nil, ErrSessionAttached
	}

	proc, err := startProcess(m.active.spec)
	if err != nil {
		m.active = nil
		return nil, err
	}

	m.active.proc = proc
	m.active.attached = true
	go m.active.awaitExit()
	return m.active, nil
}

func (m *SystemManager) release(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if m.active != nil && m.active.id == id {
		m.active = nil
	}
}

func (s *managedSession) ID() string {
	return s.id
}

func (s *managedSession) Command() string {
	return s.spec.Command
}

func (s *managedSession) WorkDirRel() string {
	return s.spec.WorkDirRel
}

func (s *managedSession) Read(p []byte) (int, error) {
	proc := s.currentProcess()
	if proc == nil {
		return 0, ErrSessionNotFound
	}
	return proc.Read(p)
}

func (s *managedSession) Write(p []byte) (int, error) {
	proc := s.currentProcess()
	if proc == nil {
		return 0, ErrSessionNotFound
	}
	return proc.Write(p)
}

func (s *managedSession) Resize(cols, rows int) error {
	if cols < 1 {
		cols = defaultCols
	}
	if rows < 1 {
		rows = defaultRows
	}
	proc := s.currentProcess()
	if proc == nil {
		return ErrSessionNotFound
	}
	return proc.Resize(cols, rows)
}

func (s *managedSession) Terminate() error {
	proc := s.currentProcess()
	if proc == nil {
		return nil
	}
	return proc.Terminate()
}

func (s *managedSession) Wait(ctx context.Context) (int, error) {
	select {
	case <-s.done:
		s.stateMu.Lock()
		defer s.stateMu.Unlock()
		return s.exitCode, s.waitErr
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (s *managedSession) Close() error {
	var closeErr error
	s.closeOnce.Do(func() {
		proc := s.currentProcess()
		if proc != nil {
			_ = proc.Terminate()
			closeErr = proc.Close()
		}
		s.manager.release(s.id)
	})
	return closeErr
}

func (s *managedSession) currentProcess() process {
	s.stateMu.Lock()
	defer s.stateMu.Unlock()
	return s.proc
}

func (s *managedSession) awaitExit() {
	s.waitOnce.Do(func() {
		proc := s.currentProcess()
		if proc == nil {
			return
		}

		code, err := proc.Wait(context.Background())

		s.stateMu.Lock()
		s.exitCode = code
		s.waitErr = err
		s.stateMu.Unlock()

		close(s.done)
	})
}

func newSessionID() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
