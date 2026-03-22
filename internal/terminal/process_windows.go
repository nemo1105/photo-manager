//go:build windows

package terminal

import (
	"context"
	"os"
	"strings"
	"syscall"

	"github.com/UserExistsError/conpty"
)

type conptyProcess struct {
	pty *conpty.ConPty
}

func startProcess(spec Spec) (process, error) {
	commandLine := windowsShellCommand(spec.Command)
	pty, err := conpty.Start(
		commandLine,
		conpty.ConPtyDimensions(defaultCols, defaultRows),
		conpty.ConPtyWorkDir(spec.WorkDirAbs),
		conpty.ConPtyEnv(spec.Env),
	)
	if err != nil {
		return nil, err
	}
	return &conptyProcess{pty: pty}, nil
}

func (p *conptyProcess) Read(buf []byte) (int, error) {
	return p.pty.Read(buf)
}

func (p *conptyProcess) Write(buf []byte) (int, error) {
	return p.pty.Write(buf)
}

func (p *conptyProcess) Close() error {
	return p.pty.Close()
}

func (p *conptyProcess) Resize(cols, rows int) error {
	return p.pty.Resize(cols, rows)
}

func (p *conptyProcess) Terminate() error {
	proc, err := os.FindProcess(p.pty.Pid())
	if err != nil {
		return err
	}
	return proc.Kill()
}

func (p *conptyProcess) Wait(ctx context.Context) (int, error) {
	code, err := p.pty.Wait(ctx)
	return int(code), err
}

func windowsShellCommand(command string) string {
	args := []string{
		"powershell.exe",
		"-NoLogo",
		"-NoProfile",
		"-Command",
		command,
	}
	escaped := make([]string, 0, len(args))
	for _, arg := range args {
		escaped = append(escaped, syscall.EscapeArg(arg))
	}
	return strings.Join(escaped, " ")
}
