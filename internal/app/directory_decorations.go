package app

import (
	"errors"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/nemo1105/photo-manager/internal/localize"
)

const (
	DirDecorationIconCheck = "check"

	DirDecorationToneSuccess = "success"
	DirDecorationToneInfo    = "info"
	DirDecorationToneWarning = "warning"
	DirDecorationToneNeutral = "neutral"
)

type DirDecoration struct {
	ID       string `json:"id"`
	Icon     string `json:"icon"`
	Tone     string `json:"tone"`
	Tooltip  string `json:"tooltip,omitempty"`
	Priority int    `json:"priority"`
}

type DirectoryDecorationContext struct {
	AbsPath string
	RelPath string
	Name    string
	Locale  localize.Locale
}

type DirectoryDecorator interface {
	DecorateDirectory(DirectoryDecorationContext) ([]DirDecoration, error)
}

type DirectoryDecoratorFunc func(DirectoryDecorationContext) ([]DirDecoration, error)

func (f DirectoryDecoratorFunc) DecorateDirectory(ctx DirectoryDecorationContext) ([]DirDecoration, error) {
	return f(ctx)
}

type doneMarkerDecorator struct{}

func defaultDirectoryDecorators() []DirectoryDecorator {
	return []DirectoryDecorator{
		doneMarkerDecorator{},
	}
}

func (doneMarkerDecorator) DecorateDirectory(ctx DirectoryDecorationContext) ([]DirDecoration, error) {
	info, err := os.Stat(filepath.Join(ctx.AbsPath, "done.txt"))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, nil
		}
		return nil, err
	}
	if info.IsDir() {
		return nil, nil
	}
	return []DirDecoration{
		{
			ID:       "done-marker",
			Icon:     DirDecorationIconCheck,
			Tone:     DirDecorationToneSuccess,
			Tooltip:  localize.DoneMarkerTooltip(ctx.Locale),
			Priority: 100,
		},
	}, nil
}

func evaluateDirectoryDecorations(absPath, relPath, name string, locale localize.Locale, decorators []DirectoryDecorator) []DirDecoration {
	if len(decorators) == 0 {
		return nil
	}

	ctx := DirectoryDecorationContext{
		AbsPath: absPath,
		RelPath: relPath,
		Name:    name,
		Locale:  locale,
	}
	decorations := make([]DirDecoration, 0, len(decorators))
	for _, decorator := range decorators {
		if decorator == nil {
			continue
		}
		items, err := decorator.DecorateDirectory(ctx)
		if err != nil {
			log.Printf("directory decorator failed for %q: %v", relPath, err)
			continue
		}
		for _, item := range items {
			normalized, ok := normalizeDirDecoration(item)
			if ok {
				decorations = append(decorations, normalized)
			}
		}
	}
	if len(decorations) == 0 {
		return nil
	}

	sort.SliceStable(decorations, func(i, j int) bool {
		if decorations[i].Priority != decorations[j].Priority {
			return decorations[i].Priority > decorations[j].Priority
		}
		return decorations[i].ID < decorations[j].ID
	})
	return decorations
}

func normalizeDirDecoration(item DirDecoration) (DirDecoration, bool) {
	item.ID = strings.TrimSpace(item.ID)
	if item.ID == "" {
		return DirDecoration{}, false
	}

	switch item.Icon {
	case DirDecorationIconCheck:
	default:
		item.Icon = DirDecorationIconCheck
	}

	switch item.Tone {
	case DirDecorationToneSuccess, DirDecorationToneInfo, DirDecorationToneWarning, DirDecorationToneNeutral:
	default:
		item.Tone = DirDecorationToneNeutral
	}

	item.Tooltip = strings.TrimSpace(item.Tooltip)
	return item, true
}
