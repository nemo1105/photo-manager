//go:build !windows

package terminal

import (
	"context"
	"errors"
	"os"
	"os/exec"

	"github.com/creack/pty"
)

type ptyProcess struct {
	cmd *exec.Cmd
	pty *os.File
}

func startProcess(spec Spec) (process, error) {
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/sh"
	}

	cmd := exec.Command(shell, "-lc", spec.Command)
	cmd.Dir = spec.WorkDirAbs
	cmd.Env = spec.Env

	ptmx, err := pty.Start(cmd)
	if err != nil {
		return nil, err
	}

	return &ptyProcess{
		cmd: cmd,
		pty: ptmx,
	}, nil
}

func (p *ptyProcess) Read(buf []byte) (int, error) {
	return p.pty.Read(buf)
}

func (p *ptyProcess) Write(buf []byte) (int, error) {
	return p.pty.Write(buf)
}

func (p *ptyProcess) Close() error {
	return p.pty.Close()
}

func (p *ptyProcess) Resize(cols, rows int) error {
	return pty.Setsize(p.pty, &pty.Winsize{
		Cols: uint16(cols),
		Rows: uint16(rows),
	})
}

func (p *ptyProcess) Terminate() error {
	if p.cmd.Process == nil {
		return nil
	}
	return p.cmd.Process.Kill()
}

func (p *ptyProcess) Wait(context.Context) (int, error) {
	err := p.cmd.Wait()
	if p.cmd.ProcessState != nil {
		return p.cmd.ProcessState.ExitCode(), nil
	}
	if errors.Is(err, os.ErrProcessDone) {
		return 0, nil
	}
	return 0, err
}
