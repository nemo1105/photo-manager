package app

import (
	"strings"
	"testing"
)

func TestWindowsTrashScriptQuotesPath(t *testing.T) {
	path := `D:\Photos\a b\c.png`
	script := windowsTrashFileScript(path)

	if !strings.Contains(script, `'D:\Photos\a b\c.png'`) {
		t.Fatalf("expected quoted path in script, got %q", script)
	}
}

func TestWindowsTrashDirectoryScriptQuotesPath(t *testing.T) {
	path := `D:\Photos\a b\folder`
	script := windowsTrashDirectoryScript(path)

	if !strings.Contains(script, `'D:\Photos\a b\folder'`) {
		t.Fatalf("expected quoted path in script, got %q", script)
	}
	if !strings.Contains(script, "DeleteDirectory") {
		t.Fatalf("expected directory delete script, got %q", script)
	}
}

func TestPowerShellSingleQuotedEscapesSingleQuotes(t *testing.T) {
	got := powershellSingleQuoted(`D:\Photos\a'b\c.png`)
	want := `D:\Photos\a''b\c.png`

	if got != want {
		t.Fatalf("unexpected escaped path: got %q want %q", got, want)
	}
}
