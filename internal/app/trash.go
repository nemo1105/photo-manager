package app

import (
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

type Trasher interface {
	Trash(path string) error
}

type systemTrash struct{}

func NewSystemTrash() Trasher {
	return systemTrash{}
}

func (systemTrash) Trash(path string) error {
	switch runtime.GOOS {
	case "windows":
		cmd := exec.Command(
			"powershell",
			"-NoProfile",
			"-Command",
			windowsTrashScript(path),
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("trash on windows: %w: %s", err, string(out))
		}
		return nil
	case "darwin":
		cmd := exec.Command("osascript", "-e", fmt.Sprintf(`tell application "Finder" to delete POSIX file %q`, path))
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("trash on macos: %w: %s", err, string(out))
		}
		return nil
	default:
		return fmt.Errorf("unsupported trash platform: %s", runtime.GOOS)
	}
}

func windowsTrashScript(path string) string {
	return fmt.Sprintf(
		"Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('%s', 'OnlyErrorDialogs', 'SendToRecycleBin')",
		powershellSingleQuoted(path),
	)
}

func powershellSingleQuoted(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
