package commandtemplate

import "testing"

func TestRenderLeavesLiteralCommandUntouched(t *testing.T) {
	command := "python script.py"

	if got, err := renderForGOOS(command, Data{CurrentFile: "/tmp/photo.jpg"}, "linux"); err != nil || got != command {
		t.Fatalf("expected literal command to stay unchanged, got %q err=%v", got, err)
	}
}

func TestRenderExpandsCurrentFileWithShellFunction(t *testing.T) {
	got, err := renderForGOOS("tool {{ shell .CurrentFile }} --again {{ shell .CurrentFile }}", Data{
		CurrentFile: "/tmp/a b/photo.jpg",
	}, "linux")
	if err != nil {
		t.Fatalf("render template: %v", err)
	}

	want := "tool '/tmp/a b/photo.jpg' --again '/tmp/a b/photo.jpg'"
	if got != want {
		t.Fatalf("unexpected expanded command: got %q want %q", got, want)
	}
}

func TestRenderSupportsTemplateFunctions(t *testing.T) {
	tests := []struct {
		name     string
		goos     string
		template string
		input    string
		want     string
	}{
		{
			name:     "powershell literal",
			goos:     "windows",
			template: `{{ powershell .CurrentFile }}`,
			input:    `D:\Photos\a b\c'd.png`,
			want:     `'D:\Photos\a b\c''d.png'`,
		},
		{
			name:     "shell literal windows",
			goos:     "windows",
			template: `{{ shell .CurrentFile }}`,
			input:    `D:\Photos\a b\c'd.png`,
			want:     `'D:\Photos\a b\c''d.png'`,
		},
		{
			name:     "shell literal posix",
			goos:     "linux",
			template: `{{ shell .CurrentFile }}`,
			input:    `/tmp/a b/c'd.png`,
			want:     `'/tmp/a b/c'\''d.png'`,
		},
		{
			name:     "slash",
			goos:     "windows",
			template: `{{ slash .CurrentFile }}`,
			input:    `D:\Photos\a b\c.png`,
			want:     `D:/Photos/a b/c.png`,
		},
		{
			name:     "pssingle",
			goos:     "windows",
			template: `{{ pssingle .CurrentFile }}`,
			input:    `D:\Photos\a'b\c.png`,
			want:     `D:\Photos\a''b\c.png`,
		},
		{
			name:     "psdouble",
			goos:     "windows",
			template: `{{ psdouble .CurrentFile }}`,
			input:    `D:\Photos\a$b` + "`" + `c.png`,
			want:     "D:\\Photos\\a`$b``c.png",
		},
		{
			name:     "urlquery",
			goos:     "windows",
			template: `{{ urlquery .CurrentFile }}`,
			input:    `D:\Photos\a b\c.png`,
			want:     `D%3A%5CPhotos%5Ca+b%5Cc.png`,
		},
		{
			name:     "pipeline",
			goos:     "windows",
			template: `{{ .CurrentFile | slash | pssingle }}`,
			input:    `D:\Photos\a'b\c.png`,
			want:     `D:/Photos/a''b/c.png`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := renderForGOOS(tc.template, Data{CurrentFile: tc.input}, tc.goos)
			if err != nil {
				t.Fatalf("render template: %v", err)
			}
			if got != tc.want {
				t.Fatalf("unexpected render result: got %q want %q", got, tc.want)
			}
		})
	}
}

func TestValidateRejectsLegacyCurrentFilePlaceholder(t *testing.T) {
	if err := Validate(`python script.py {{currentFile}}`); err == nil {
		t.Fatal("expected legacy placeholder to be rejected")
	}
}

func TestValidateRejectsUnknownField(t *testing.T) {
	if err := Validate(`python script.py {{ .CurrentDir }}`); err == nil {
		t.Fatal("expected unknown field to be rejected")
	}
}
