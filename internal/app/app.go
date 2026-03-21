package app

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"unicode"
	"unicode/utf8"

	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/localize"
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
	LaunchRoot               string         `json:"launchRoot"`
	CurrentPath              string         `json:"currentPath"`
	CurrentName              string         `json:"currentName"`
	ParentPath               string         `json:"parentPath"`
	CanGoUp                  bool           `json:"canGoUp"`
	Breadcrumbs              []Breadcrumb   `json:"breadcrumbs"`
	Directories              []DirEntry     `json:"directories"`
	Images                   []ImageEntry   `json:"images"`
	Session                  SessionInfo    `json:"session"`
	Config                   *config.Config `json:"config"`
	CurrentDirStartsAsReview bool           `json:"currentDirStartsAsReview"`
	Notice                   string         `json:"notice,omitempty"`
}

type BrowserStatsData struct {
	CurrentPath         string `json:"currentPath"`
	DirectoryCount      int    `json:"directoryCount"`
	ImageCount          int    `json:"imageCount"`
	RecursiveImageCount int    `json:"recursiveImageCount"`
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

var (
	errCurrentDirNoImages     = localize.NewStaticError("current directory has no images", "当前文件夹没有图片")
	errNoActiveSession        = localize.NewStaticError("no active session", "当前没有活动会话")
	errImageOutsideCurrentDir = localize.NewStaticError("image is not inside current directory", "图片不在当前目录中")
	errActionKeyNotConfigured = localize.NewStaticError("action key not configured", "该按键没有配置动作")
	errSourceDestinationSame  = localize.NewStaticError("source and destination are the same", "源路径与目标路径相同")
	errRestoreOnlyInTarget    = localize.NewStaticError("restore is only available in configured target directories", "恢复只允许在已配置的目标目录中使用")
	errUnsupportedAction      = localize.NewStaticError("unsupported action", "不支持该动作")
	errPathNotDirectory       = localize.NewStaticError("path is not a directory", "该路径不是目录")
	errPathIsDirectory        = localize.NewStaticError("path is a directory", "该路径是目录")
	errUnsupportedImage       = localize.NewStaticError("unsupported image", "不支持该图片格式")
	errAbsolutePathNotAllowed = localize.NewStaticError("absolute path is not allowed", "不允许使用绝对路径")
	errPathEscapesLaunchRoot  = localize.NewStaticError("path escapes launch root", "路径超出了启动根目录")
	errTargetEmpty            = localize.NewStaticError("target is empty", "目标路径不能为空")
)

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

func (a *App) Browser(relPath string, locale localize.Locale) (*BrowserData, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	notice := a.maybeAutoEndSessionLocked(locale, absPath)

	dirs, images, err := listDirectory(absPath, a.launchRoot)
	if err != nil {
		return nil, err
	}

	parent := parentRel(relPath)
	_, startsAsReview := a.sessionStartRootLocked(absPath)
	return &BrowserData{
		LaunchRoot:               a.launchRoot,
		CurrentPath:              relPath,
		CurrentName:              displayName(absPath),
		ParentPath:               parent,
		CanGoUp:                  relPath != "",
		Breadcrumbs:              buildBreadcrumbs(locale, relPath),
		Directories:              dirs,
		Images:                   images,
		Session:                  a.sessionInfoLocked(),
		Config:                   a.cfg.Clone(),
		CurrentDirStartsAsReview: startsAsReview,
		Notice:                   notice,
	}, nil
}

func (a *App) BrowserStats(relPath string) (*BrowserStatsData, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	dirs, images, err := listDirectory(absPath, a.launchRoot)
	if err != nil {
		return nil, err
	}

	recursiveImages, err := countVisibleImagesRecursive(absPath)
	if err != nil {
		return nil, err
	}

	return &BrowserStatsData{
		CurrentPath:         relPath,
		DirectoryCount:      len(dirs),
		ImageCount:          len(images),
		RecursiveImageCount: recursiveImages,
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
		return nil, errCurrentDirNoImages
	}

	sessionRootAbs, _ := a.sessionStartRootLocked(absPath)
	a.session = &Session{RootAbs: sessionRootAbs}
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

func (a *App) Slideshow(relPath string, locale localize.Locale) (*SlideshowData, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	relPath, absPath, err := a.resolveDir(relPath)
	if err != nil {
		return nil, err
	}

	notice := a.maybeAutoEndSessionLocked(locale, absPath)
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
		if binding.Action == "move" && a.moveTargetMatchesCurrentDirLocked(binding, absPath) {
			continue
		}
		enabled := a.session != nil
		if binding.Action == "restore" {
			enabled = a.session != nil && isTarget
		}
		actions = append(actions, ActionButton{
			Key:     binding.Key,
			Action:  binding.Action,
			Target:  binding.Target,
			Label:   actionLabel(locale, binding),
			Enabled: enabled,
		})
	}

	return &SlideshowData{
		CurrentPath:        relPath,
		CurrentName:        displayName(absPath),
		Breadcrumbs:        buildBreadcrumbs(locale, relPath),
		Images:             images,
		Session:            a.sessionInfoLocked(),
		Config:             a.cfg.Clone(),
		ActionButtons:      actions,
		CurrentDirIsTarget: isTarget,
		Notice:             notice,
	}, nil
}

func (a *App) PerformAction(currentDirRel, imageRel, actionKey string, locale localize.Locale) (*ActionResult, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if a.session == nil {
		return nil, errNoActiveSession
	}

	currentDirRel, currentDirAbs, err := a.resolveDir(currentDirRel)
	if err != nil {
		return nil, err
	}
	if notice := a.maybeAutoEndSessionLocked(locale, currentDirAbs); notice != "" {
		return nil, localize.NewStaticError("left the active work directory range, session ended automatically", notice)
	}

	imageRel, imageAbs, err := a.resolveFile(imageRel)
	if err != nil {
		return nil, err
	}
	if !isWithinDir(imageAbs, currentDirAbs) {
		return nil, errImageOutsideCurrentDir
	}

	key, err := config.NormalizeKey(actionKey)
	if err != nil {
		return nil, err
	}

	binding, found := findAction(a.cfg.Actions, key)
	if !found {
		return nil, errActionKeyNotConfigured
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
			return nil, errSourceDestinationSame
		}
		if err := os.MkdirAll(dstDir, 0o755); err != nil {
			return nil, err
		}
		if err := os.Rename(imageAbs, dstPath); err != nil {
			return nil, err
		}
		notice = localize.MoveNotice(locale, filepath.Base(imageAbs))
	case "delete":
		if err := a.trash.Trash(imageAbs); err != nil {
			return nil, err
		}
		notice = localize.DeleteNotice(locale, filepath.Base(imageAbs))
	case "restore":
		if !a.dirMatchesMoveTargetLocked(currentDirAbs) {
			return nil, errRestoreOnlyInTarget
		}
		dstPath, err := uniqueDestination(a.session.RootAbs, filepath.Base(imageAbs))
		if err != nil {
			return nil, err
		}
		if samePath(imageAbs, dstPath) {
			return nil, errSourceDestinationSame
		}
		if err := os.Rename(imageAbs, dstPath); err != nil {
			return nil, err
		}
		notice = localize.RestoreNotice(locale, filepath.Base(imageAbs))
	default:
		return nil, errUnsupportedAction
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
		return "", "", errPathNotDirectory
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
		return "", "", errPathIsDirectory
	}
	if !isSupportedImage(absPath) {
		return "", "", errUnsupportedImage
	}
	return cleanRel, absPath, nil
}

func (a *App) maybeAutoEndSessionLocked(locale localize.Locale, currentAbs string) string {
	if a.session == nil {
		return ""
	}
	if isWithinDir(currentAbs, a.session.RootAbs) {
		return ""
	}
	a.session = nil
	return localize.SessionAutoEndedNotice(locale)
}

func (a *App) sessionStartRootLocked(currentAbs string) (string, bool) {
	parentAbs := filepath.Dir(currentAbs)
	if samePath(parentAbs, currentAbs) || !isWithinDir(parentAbs, a.launchRoot) {
		return currentAbs, false
	}

	for _, binding := range a.cfg.Actions {
		if binding.Action != "move" || filepath.IsAbs(strings.TrimSpace(binding.Target)) {
			continue
		}
		targetAbs, err := resolveTargetDir(binding.Target, parentAbs)
		if err != nil {
			continue
		}
		if samePath(targetAbs, currentAbs) {
			return parentAbs, true
		}
	}

	return currentAbs, false
}

func (a *App) dirMatchesMoveTargetLocked(currentAbs string) bool {
	if a.session == nil {
		return false
	}
	for _, binding := range a.cfg.Actions {
		if a.moveTargetMatchesCurrentDirLocked(binding, currentAbs) {
			return true
		}
	}
	return false
}

func (a *App) moveTargetMatchesCurrentDirLocked(binding config.ActionBinding, currentAbs string) bool {
	if a.session == nil || binding.Action != "move" {
		return false
	}
	targetAbs, err := resolveTargetDir(binding.Target, a.session.RootAbs)
	if err != nil {
		return false
	}
	return samePath(targetAbs, currentAbs)
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

func actionLabel(locale localize.Locale, binding config.ActionBinding) string {
	return localize.ActionLabel(locale, binding.Action, binding.Target)
}

func buildBreadcrumbs(locale localize.Locale, relPath string) []Breadcrumb {
	breadcrumbs := []Breadcrumb{{Name: localize.RootName(locale), Path: ""}}
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
		return "", errAbsolutePathNotAllowed
	}
	if clean == ".." || strings.HasPrefix(clean, ".."+string(filepath.Separator)) {
		return "", errPathEscapesLaunchRoot
	}
	if clean == "." {
		return "", nil
	}
	return filepath.ToSlash(clean), nil
}

func resolveTargetDir(target, sessionRoot string) (string, error) {
	target = strings.TrimSpace(target)
	if target == "" {
		return "", errTargetEmpty
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
		return naturalNameLess(dirs[i].Name, dirs[j].Name)
	})
	sort.Slice(images, func(i, j int) bool {
		return strings.ToLower(images[i].Name) < strings.ToLower(images[j].Name)
	})
	return dirs, images, nil
}

func naturalNameLess(a, b string) bool {
	ai := 0
	bi := 0
	for ai < len(a) && bi < len(b) {
		ar, as := utf8.DecodeRuneInString(a[ai:])
		br, bs := utf8.DecodeRuneInString(b[bi:])
		if isASCIIDigit(ar) && isASCIIDigit(br) {
			nextA, digitsA := readDigitRun(a, ai)
			nextB, digitsB := readDigitRun(b, bi)
			if cmp := compareDigitRuns(digitsA, digitsB); cmp != 0 {
				return cmp < 0
			}
			ai = nextA
			bi = nextB
			continue
		}

		lowerA := unicode.ToLower(ar)
		lowerB := unicode.ToLower(br)
		if lowerA != lowerB {
			return lowerA < lowerB
		}
		ai += as
		bi += bs
	}

	if ai != len(a) || bi != len(b) {
		return ai == len(a)
	}

	lowerA := strings.ToLower(a)
	lowerB := strings.ToLower(b)
	if lowerA != lowerB {
		return lowerA < lowerB
	}
	return a < b
}

func isASCIIDigit(r rune) bool {
	return r >= '0' && r <= '9'
}

func readDigitRun(value string, start int) (int, string) {
	end := start
	for end < len(value) {
		r, size := utf8.DecodeRuneInString(value[end:])
		if !isASCIIDigit(r) {
			break
		}
		end += size
	}
	return end, value[start:end]
}

func compareDigitRuns(a, b string) int {
	trimmedA := strings.TrimLeft(a, "0")
	trimmedB := strings.TrimLeft(b, "0")
	if trimmedA == "" {
		trimmedA = "0"
	}
	if trimmedB == "" {
		trimmedB = "0"
	}
	if len(trimmedA) != len(trimmedB) {
		if len(trimmedA) < len(trimmedB) {
			return -1
		}
		return 1
	}
	if trimmedA != trimmedB {
		if trimmedA < trimmedB {
			return -1
		}
		return 1
	}
	if len(a) != len(b) {
		if len(a) < len(b) {
			return -1
		}
		return 1
	}
	return 0
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

func countVisibleImagesRecursive(absPath string) (int, error) {
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return 0, err
	}

	total := 0
	for _, entry := range entries {
		entryPath := filepath.Join(absPath, entry.Name())
		hidden, err := isHidden(entryPath, entry)
		if err != nil || hidden {
			continue
		}

		if entry.IsDir() {
			nestedTotal, err := countVisibleImagesRecursive(entryPath)
			if err != nil {
				return 0, err
			}
			total += nestedTotal
			continue
		}
		if isSupportedImage(entry.Name()) {
			total += 1
		}
	}
	return total, nil
}

func isSupportedImage(name string) bool {
	switch strings.ToLower(filepath.Ext(name)) {
	case ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp":
		return true
	default:
		return false
	}
}
