package app

import (
	"strings"
	"testing"
)

func TestWindowsTrashScriptQuotesPath(t *testing.T) {
	path := `D:\Photos\a b\c.png`
	script := windowsTrashScript(path)

	if !strings.Contains(script, `'D:\Photos\a b\c.png'`) {
		t.Fatalf("expected quoted path in script, got %q", script)
	}
}

func TestPowerShellSingleQuotedEscapesSingleQuotes(t *testing.T) {
	got := powershellSingleQuoted(`D:\Photos\a'b\c.png`)
	want := `D:\Photos\a''b\c.png`

	if got != want {
		t.Fatalf("unexpected escaped path: got %q want %q", got, want)
	}
}
