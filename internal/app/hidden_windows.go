//go:build windows

package app

import (
	"os"
	"path/filepath"
	"strings"
	"syscall"
)

func isHidden(path string, entry os.DirEntry) (bool, error) {
	if strings.HasPrefix(filepath.Base(path), ".") {
		return true, nil
	}
	ptr, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return false, err
	}
	attrs, err := syscall.GetFileAttributes(ptr)
	if err != nil {
		return false, err
	}
	return attrs&syscall.FILE_ATTRIBUTE_HIDDEN != 0, nil
}
