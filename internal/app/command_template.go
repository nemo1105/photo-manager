package app

import (
	"runtime"
	"strings"
)

const currentFilePlaceholder = "{{currentFile}}"

func expandCommandTemplate(command, imagePath string) string {
	return expandCommandTemplateForGOOS(command, imagePath, runtime.GOOS)
}

func expandCommandTemplateForGOOS(command, imagePath, goos string) string {
	if !strings.Contains(command, currentFilePlaceholder) {
		return command
	}
	return strings.ReplaceAll(command, currentFilePlaceholder, quotePathForShellForGOOS(imagePath, goos))
}

func quotePathForShell(path string) string {
	return quotePathForShellForGOOS(path, runtime.GOOS)
}

func quotePathForShellForGOOS(path, goos string) string {
	if goos == "windows" {
		return "'" + powershellSingleQuoted(path) + "'"
	}
	return posixSingleQuoted(path)
}

func posixSingleQuoted(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}
