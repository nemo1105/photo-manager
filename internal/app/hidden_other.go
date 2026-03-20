//go:build !windows

package app

import (
	"os"
	"path/filepath"
	"strings"
)

func isHidden(path string, entry os.DirEntry) (bool, error) {
	return strings.HasPrefix(filepath.Base(path), "."), nil
}
