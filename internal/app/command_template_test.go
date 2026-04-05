package app

import "testing"

func TestExpandCommandTemplateLeavesLiteralCommandUntouched(t *testing.T) {
	command := "python script.py"

	if got := expandCommandTemplateForGOOS(command, "/tmp/photo.jpg", "linux"); got != command {
		t.Fatalf("expected literal command to stay unchanged, got %q", got)
	}
}

func TestExpandCommandTemplateReplacesAllCurrentFilePlaceholders(t *testing.T) {
	got := expandCommandTemplateForGOOS("tool {{currentFile}} --again {{currentFile}}", "/tmp/photo.jpg", "linux")
	want := "tool '/tmp/photo.jpg' --again '/tmp/photo.jpg'"

	if got != want {
		t.Fatalf("unexpected expanded command: got %q want %q", got, want)
	}
}

func TestQuotePathForShellForGOOSEscapesSingleQuotes(t *testing.T) {
	tests := []struct {
		name string
		goos string
		path string
		want string
	}{
		{
			name: "windows",
			goos: "windows",
			path: `D:\Photos\a b\c'd.png`,
			want: `'D:\Photos\a b\c''d.png'`,
		},
		{
			name: "posix",
			goos: "linux",
			path: `/tmp/a b/c'd.png`,
			want: `'/tmp/a b/c'\''d.png'`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := quotePathForShellForGOOS(tc.path, tc.goos); got != tc.want {
				t.Fatalf("unexpected quoted path: got %q want %q", got, tc.want)
			}
		})
	}
}
