package app

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/nemo1105/photo-manager/internal/config"
)

type App struct {
	mu         sync.Mutex
	launchRoot string
	configPath string
	cfg        *config.Config
	trash      Trasher
	session    *Session
}

type Session struct {
	RootAbs string
}

type SessionInfo struct {
	Active   bool   `json:"active"`
	RootPath string `json:"rootPath"`
}

type Breadcrumb struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

type DirEntry struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	HasChildren bool   `json:"hasChildren"`
}

type ImageEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
	URL  string `json:"url"`
}

type ActionButton struct {
	Key     string `json:"key"`
	Action  string `json:"action"`
	Target  string `json:"target,omitempty"`
	Label   string `json:"label"`
	Enabled bool   `json:"enabled"`
}

type BrowserData struct {
	LaunchRoot  string         `json:"launchRoot"`
	CurrentPath string         `json:"currentPath"`
	CurrentName string         `json:"currentName"`
	ParentPath  string         `json:"parentPath"`
	CanGoUp     bool           `json:"canGoUp"`
	Breadcrumbs []Breadcrumb   `json:"breadcrumbs"`
	Directories []DirEntry     `json:"directories"`
	Images      []ImageEntry   `json:"images"`
	Session     SessionInfo    `json:"session"`
	Config      *config.Config `json:"config"`
	Notice      string         `json:"notice,omitempty"`
}

type TreeData struct {
	CurrentPath string     `json:"currentPath"`
	CurrentName string     `json:"currentName"`
	Directories []DirEntry `json:"directories"`
}

type SlideshowData struct {
	CurrentPath        string         `json:"currentPath"`
	CurrentName        string         `json:"currentName"`
	Breadcrumbs        []Breadcrumb   `json:"breadcrumbs"`
	Images             []ImageEntry   `json:"images"`
	Session            SessionInfo    `json:"session"`
	Config             *config.Config `json:"config"`
	ActionButtons      []ActionButton `json:"actionButtons"`
	CurrentDirIsTarget bool           `json:"currentDirIsTarget"`
	Notice             string         `json:"notice,omitempty"`
}

type ActionResult struct {
	Notice  string      `json:"notice"`
	Session SessionInfo `json:"session"`
}

type OpenSessionResult struct {
	Session       SessionInfo `json:"session"`
	SlideshowPath string      `json:"slideshowPath"`
}

func New(launchRoot, configPath string, cfg *config.Config, trash Trasher) *App {
	return &App{
		launchRoot: filepath.Clean(launchRoot),
		configPath: configPath,
		cfg:        cfg.Clone(),
		trash:      trash,
	}
}

func (a *App) GetConfig() *config.Config {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.cfg.Clone()
}

func (a *App) SaveConfig(cfg *config.Config) (*config.Config, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	copyCfg := cfg.Clone()
	if err := config.Save(a.configPath, copyCfg); err != nil {
		return nil, err
	}
	a.cfg = copyCfg
	return a.cfg.Clone(), nil
}

func (a *App) Browser(relPath string) (*BrowserData, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	notice := a.maybeAutoEndSessionLocked(absPath)

	dirs, images, err := listDirectory(absPath, a.launchRoot)
	if err != nil {
		return nil, err
	}

	parent := parentRel(relPath)
	return &BrowserData{
		LaunchRoot:  a.launchRoot,
		CurrentPath: relPath,
		CurrentName: displayName(absPath),
		ParentPath:  parent,
		CanGoUp:     relPath != "",
		Breadcrumbs: buildBreadcrumbs(relPath),
		Directories: dirs,
		Images:      images,
		Session:     a.sessionInfoLocked(),
		Config:      a.cfg.Clone(),
		Notice:      notice,
	}, nil
}

func (a *App) Tree(relPath string) (*TreeData, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	dirs, _, err := listDirectory(absPath, a.launchRoot)
	if err != nil {
		return nil, err
	}

	return &TreeData{
		CurrentPath: relPath,
		CurrentName: displayName(absPath),
		Directories: dirs,
	}, nil
}

func (a *App) OpenSession(relPath string) (*OpenSessionResult, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	if a.session != nil && isWithinDir(absPath, a.session.RootAbs) {
		return &OpenSessionResult{
			Session:       a.sessionInfoLocked(),
			SlideshowPath: relPath,
		}, nil
	}

	_, images, err := listDirectory(absPath, a.launchRoot)
	if err != nil {
		return nil, err
	}
	if len(images) == 0 {
		return nil, errors.New("current directory has no images")
	}

	a.session = &Session{RootAbs: absPath}
	return &OpenSessionResult{
		Session:       a.sessionInfoLocked(),
		SlideshowPath: relPath,
	}, nil
}

func (a *App) EndSession() SessionInfo {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.session = nil
	return a.sessionInfoLocked()
}

func (a *App) Slideshow(relPath string) (*SlideshowData, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	notice := a.maybeAutoEndSessionLocked(absPath)
	dirs, images, err := listDirectory(absPath, a.launchRoot)
	if err != nil {
		return nil, err
	}
	_ = dirs

	isTarget := false
	if a.session != nil {
		isTarget = a.dirMatchesMoveTargetLocked(absPath)
	}

	actions := make([]ActionButton, 0, len(a.cfg.Actions))
	for _, binding := range a.cfg.Actions {
		enabled := a.session != nil
		if binding.Action == "restore" {
			enabled = a.session != nil && isTarget
		}
		actions = append(actions, ActionButton{
			Key:     binding.Key,
			Action:  binding.Action,
			Target:  binding.Target,
			Label:   actionLabel(binding),
			Enabled: enabled,
		})
	}

	return &SlideshowData{
		CurrentPath:        relPath,
		CurrentName:        displayName(absPath),
		Breadcrumbs:        buildBreadcrumbs(relPath),
		Images:             images,
		Session:            a.sessionInfoLocked(),
		Config:             a.cfg.Clone(),
		ActionButtons:      actions,
		CurrentDirIsTarget: isTarget,
		Notice:             notice,
	}, nil
}

func (a *App) PerformAction(currentDirRel, imageRel, actionKey string) (*ActionResult, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.session == nil {
		return nil, errors.New("no active session")
	}

	currentDirRel, currentDirAbs, err := a.resolveDir(currentDirRel)
	if err != nil {
		return nil, err
	}
	if notice := a.maybeAutoEndSessionLocked(currentDirAbs); notice != "" {
		return nil, errors.New(notice)
	}

	imageRel, imageAbs, err := a.resolveFile(imageRel)
	if err != nil {
		return nil, err
	}
	if !isWithinDir(imageAbs, currentDirAbs) {
		return nil, errors.New("image is not inside current directory")
	}

	key, err := config.NormalizeKey(actionKey)
	if err != nil {
		return nil, err
	}

	binding, found := findAction(a.cfg.Actions, key)
	if !found {
		return nil, errors.New("action key not configured")
	}

	var notice string
	switch binding.Action {
	case "move":
		dstDir, err := resolveTargetDir(binding.Target, a.session.RootAbs)
		if err != nil {
			return nil, err
		}
		dstPath, err := uniqueDestination(dstDir, filepath.Base(imageAbs))
		if err != nil {
			return nil, err
		}
		if samePath(imageAbs, dstPath) {
			return nil, errors.New("source and destination are the same")
		}
		if err := os.MkdirAll(dstDir, 0o755); err != nil {
			return nil, err
		}
		if err := os.Rename(imageAbs, dstPath); err != nil {
			return nil, err
		}
		notice = fmt.Sprintf("moved %s", filepath.Base(imageAbs))
	case "delete":
		if err := a.trash.Trash(imageAbs); err != nil {
			return nil, err
		}
		notice = fmt.Sprintf("deleted %s to recycle bin", filepath.Base(imageAbs))
	case "restore":
		if !a.dirMatchesMoveTargetLocked(currentDirAbs) {
			return nil, errors.New("restore is only available in configured target directories")
		}
		dstPath, err := uniqueDestination(a.session.RootAbs, filepath.Base(imageAbs))
		if err != nil {
			return nil, err
		}
		if samePath(imageAbs, dstPath) {
			return nil, errors.New("source and destination are the same")
		}
		if err := os.Rename(imageAbs, dstPath); err != nil {
			return nil, err
		}
		notice = fmt.Sprintf("restored %s", filepath.Base(imageAbs))
	default:
		return nil, errors.New("unsupported action")
	}

	_ = currentDirRel
	_ = imageRel
	return &ActionResult{
		Notice:  notice,
		Session: a.sessionInfoLocked(),
	}, nil
}

func (a *App) ImagePath(relPath string) (string, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	_, absPath, err := a.resolveFile(relPath)
	return absPath, err
}

func (a *App) resolveDir(relPath string) (string, string, error) {
	cleanRel, err := sanitizeRelPath(relPath)
	if err != nil {
		return "", "", err
	}
	absPath := filepath.Join(a.launchRoot, filepath.FromSlash(cleanRel))
	info, err := os.Stat(absPath)
	if err != nil {
		return "", "", err
	}
	if !info.IsDir() {
		return "", "", errors.New("path is not a directory")
	}
	return cleanRel, absPath, nil
}

func (a *App) resolveFile(relPath string) (string, string, error) {
	cleanRel, err := sanitizeRelPath(relPath)
	if err != nil {
		return "", "", err
	}
	absPath := filepath.Join(a.launchRoot, filepath.FromSlash(cleanRel))
	info, err := os.Stat(absPath)
	if err != nil {
		return "", "", err
	}
	if info.IsDir() {
		return "", "", errors.New("path is a directory")
	}
	if !isSupportedImage(absPath) {
		return "", "", errors.New("unsupported image")
	}
	return cleanRel, absPath, nil
}

func (a *App) maybeAutoEndSessionLocked(currentAbs string) string {
	if a.session == nil {
		return ""
	}
	if isWithinDir(currentAbs, a.session.RootAbs) {
		return ""
	}
	a.session = nil
	return "left the active work directory range, session ended automatically"
}

func (a *App) dirMatchesMoveTargetLocked(currentAbs string) bool {
	if a.session == nil {
		return false
	}
	for _, binding := range a.cfg.Actions {
		if binding.Action != "move" {
			continue
		}
		targetAbs, err := resolveTargetDir(binding.Target, a.session.RootAbs)
		if err != nil {
			continue
		}
		if samePath(targetAbs, currentAbs) {
			return true
		}
	}
	return false
}

func (a *App) sessionInfoLocked() SessionInfo {
	if a.session == nil {
		return SessionInfo{}
	}
	rootRel, err := filepath.Rel(a.launchRoot, a.session.RootAbs)
	if err != nil || rootRel == "." {
		rootRel = ""
	}
	return SessionInfo{
		Active:   true,
		RootPath: filepath.ToSlash(rootRel),
	}
}

func findAction(actions []config.ActionBinding, key string) (config.ActionBinding, bool) {
	for _, action := range actions {
		if action.Key == key {
			return action, true
		}
	}
	return config.ActionBinding{}, false
}

func actionLabel(binding config.ActionBinding) string {
	switch binding.Action {
	case "move":
		return "Move to " + binding.Target
	case "delete":
		return "Delete"
	case "restore":
		return "Restore"
	default:
		return binding.Action
	}
}

func buildBreadcrumbs(relPath string) []Breadcrumb {
	breadcrumbs := []Breadcrumb{{Name: "Root", Path: ""}}
	if relPath == "" {
		return breadcrumbs
	}
	parts := strings.Split(relPath, "/")
	current := ""
	for _, part := range parts {
		if current == "" {
			current = part
		} else {
			current += "/" + part
		}
		breadcrumbs = append(breadcrumbs, Breadcrumb{Name: part, Path: current})
	}
	return breadcrumbs
}

func parentRel(relPath string) string {
	if relPath == "" {
		return ""
	}
	parent := filepath.ToSlash(filepath.Dir(filepath.FromSlash(relPath)))
	if parent == "." {
		return ""
	}
	return parent
}

func displayName(absPath string) string {
	name := filepath.Base(absPath)
	if name == string(filepath.Separator) || name == "." || name == "" {
		return absPath
	}
	return name
}

func sanitizeRelPath(relPath string) (string, error) {
	relPath = strings.TrimSpace(relPath)
	if relPath == "" || relPath == "." {
		return "", nil
	}
	clean := filepath.Clean(filepath.FromSlash(relPath))
	if filepath.IsAbs(clean) {
		return "", errors.New("absolute path is not allowed")
	}
	if clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", errors.New("path escapes launch root")
	}
	if clean == "." {
		return "", nil
	}
	return filepath.ToSlash(clean), nil
}

func resolveTargetDir(target, sessionRoot string) (string, error) {
	target = strings.TrimSpace(target)
	if target == "" {
		return "", errors.New("target is empty")
	}
	if filepath.IsAbs(target) {
		return filepath.Clean(target), nil
	}
	return filepath.Join(sessionRoot, filepath.FromSlash(target)), nil
}

func uniqueDestination(dstDir, baseName string) (string, error) {
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		return "", err
	}

	ext := filepath.Ext(baseName)
	name := strings.TrimSuffix(baseName, ext)
	candidate := filepath.Join(dstDir, baseName)
	if _, err := os.Stat(candidate); errors.Is(err, os.ErrNotExist) {
		return candidate, nil
	} else if err != nil {
		return "", err
	}

	for i := 1; ; i++ {
		candidate = filepath.Join(dstDir, fmt.Sprintf("%s (%d)%s", name, i, ext))
		if _, err := os.Stat(candidate); errors.Is(err, os.ErrNotExist) {
			return candidate, nil
		} else if err != nil {
			return "", err
		}
	}
}

func samePath(aPath, bPath string) bool {
	return filepath.Clean(aPath) == filepath.Clean(bPath)
}

func isWithinDir(path, root string) bool {
	rel, err := filepath.Rel(root, path)
	if err != nil {
		return false
	}
	return rel == "." || (rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)))
}

func listDirectory(absPath, launchRoot string) ([]DirEntry, []ImageEntry, error) {
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return nil, nil, err
	}

	dirs := make([]DirEntry, 0)
	images := make([]ImageEntry, 0)
	for _, entry := range entries {
		entryPath := filepath.Join(absPath, entry.Name())
		hidden, err := isHidden(entryPath, entry)
		if err != nil || hidden {
			continue
		}

		if entry.IsDir() {
			rel, err := filepath.Rel(launchRoot, entryPath)
			if err != nil {
				continue
			}
			dirs = append(dirs, DirEntry{
				Name:        entry.Name(),
				Path:        filepath.ToSlash(rel),
				HasChildren: hasVisibleChildDirectory(entryPath),
			})
			continue
		}
		if !isSupportedImage(entry.Name()) {
			continue
		}
		rel, err := filepath.Rel(launchRoot, entryPath)
		if err != nil {
			continue
		}
		images = append(images, ImageEntry{
			Name: entry.Name(),
			Path: filepath.ToSlash(rel),
			URL:  "/image?path=" + filepath.ToSlash(rel),
		})
	}

	sort.Slice(dirs, func(i, j int) bool {
		return strings.ToLower(dirs[i].Name) < strings.ToLower(dirs[j].Name)
	})
	sort.Slice(images, func(i, j int) bool {
		return strings.ToLower(images[i].Name) < strings.ToLower(images[j].Name)
	})
	return dirs, images, nil
}

func hasVisibleChildDirectory(absPath string) bool {
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return false
	}
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		entryPath := filepath.Join(absPath, entry.Name())
		hidden, err := isHidden(entryPath, entry)
		if err != nil || hidden {
			continue
		}
		return true
	}
	return false
}

func isSupportedImage(name string) bool {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return true
	default:
		return false
	}
}
