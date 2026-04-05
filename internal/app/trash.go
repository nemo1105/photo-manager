package app

import (
	"fmt"
	"os"
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
	info, err := os.Stat(path)
	if err != nil {
		return err
	}

	switch runtime.GOOS {
	case "windows":
		script := windowsTrashFileScript(path)
		if info.IsDir() {
			script = windowsTrashDirectoryScript(path)
		}
		cmd := exec.Command(
			"powershell",
			"-NoProfile",
			"-Command",
			script,
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

func windowsTrashFileScript(path string) string {
	return fmt.Sprintf(
		"Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('%s', 'OnlyErrorDialogs', 'SendToRecycleBin')",
		powershellSingleQuoted(path),
	)
}

func windowsTrashDirectoryScript(path string) string {
	return fmt.Sprintf(
		"Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('%s', 'OnlyErrorDialogs', 'SendToRecycleBin')",
		powershellSingleQuoted(path),
	)
}

func powershellSingleQuoted(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
