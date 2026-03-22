package app

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"sync"
	"testing"

	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/localize"
	"github.com/nemo1105/photo-manager/internal/terminal"
)

type fakeTrash struct {
	paths []string
}

func (f *fakeTrash) Trash(path string) error {
	f.paths = append(f.paths, path)
	return os.Remove(path)
}

type fakeTerminalManager struct {
	reserved   []terminal.Spec
	reserveErr error
	session    terminal.Session
	attachID   string
	attachErr  error
}

func (f *fakeTerminalManager) Reserve(spec terminal.Spec) (*terminal.Reservation, error) {
	f.reserved = append(f.reserved, spec)
	if f.reserveErr != nil {
		return nil, f.reserveErr
	}
	return &terminal.Reservation{
		ID:         "cmd-1",
		Command:    spec.Command,
		WorkDirRel: spec.WorkDirRel,
	}, nil
}

func (f *fakeTerminalManager) Attach(id string) (terminal.Session, error) {
	f.attachID = id
	if f.attachErr != nil {
		return nil, f.attachErr
	}
	return f.session, nil
}

type fakeTerminalSession struct {
	chunks       [][]byte
	readIndex    int
	readDone     chan struct{}
	readDoneOnce sync.Once
	writes       [][]byte
	resizes      [][2]int
	terminated   bool
	closed       bool
	exitCode     int
	waitErr      error
}

func newFakeTerminalSession(chunks ...string) *fakeTerminalSession {
	byteChunks := make([][]byte, 0, len(chunks))
	for _, chunk := range chunks {
		byteChunks = append(byteChunks, []byte(chunk))
	}
	return &fakeTerminalSession{
		chunks:   byteChunks,
		readDone: make(chan struct{}),
	}
}

func (f *fakeTerminalSession) ID() string {
	return "cmd-1"
}

func (f *fakeTerminalSession) Command() string {
	return "python script.py"
}

func (f *fakeTerminalSession) WorkDirRel() string {
	return "work"
}

func (f *fakeTerminalSession) Read(p []byte) (int, error) {
	if f.readIndex >= len(f.chunks) {
		f.markReadDone()
		return 0, io.EOF
	}
	chunk := f.chunks[f.readIndex]
	f.readIndex += 1
	copy(p, chunk)
	if f.readIndex >= len(f.chunks) {
		f.markReadDone()
	}
	return len(chunk), nil
}

func (f *fakeTerminalSession) Write(p []byte) (int, error) {
	copyBuf := append([]byte(nil), p...)
	f.writes = append(f.writes, copyBuf)
	return len(p), nil
}

func (f *fakeTerminalSession) Resize(cols, rows int) error {
	f.resizes = append(f.resizes, [2]int{cols, rows})
	return nil
}

func (f *fakeTerminalSession) Terminate() error {
	f.terminated = true
	f.markReadDone()
	return nil
}

func (f *fakeTerminalSession) Wait(ctx context.Context) (int, error) {
	select {
	case <-f.readDone:
		return f.exitCode, f.waitErr
	case <-ctx.Done():
		return 0, ctx.Err()
	}
}

func (f *fakeTerminalSession) Close() error {
	f.closed = true
	f.markReadDone()
	return nil
}

func (f *fakeTerminalSession) markReadDone() {
	f.readDoneOnce.Do(func() {
		close(f.readDone)
	})
}

func TestMoveAndRestoreUseSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "photo.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession(""); err != nil {
		t.Fatalf("open session: %v", err)
	}

	if _, err := app.PerformAction("", "photo.jpg", "arrowdown", localize.EN); err != nil {
		t.Fatalf("move photo: %v", err)
	}

	movedPath := filepath.Join(root, "0", "photo.jpg")
	if _, err := os.Stat(movedPath); err != nil {
		t.Fatalf("expected moved file: %v", err)
	}

	if _, err := app.PerformAction("0", "0/photo.jpg", "arrowup", localize.EN); err != nil {
		t.Fatalf("restore photo: %v", err)
	}

	if _, err := os.Stat(filepath.Join(root, "photo.jpg")); err != nil {
		t.Fatalf("expected restored file in session root: %v", err)
	}
}

func TestStartCommandActionUsesSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "photo.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	manager := &fakeTerminalManager{}
	app := NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{}, manager)

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	result, err := app.StartCommandAction("work", "work/photo.jpg", "c", localize.EN)
	if err != nil {
		t.Fatalf("start command action: %v", err)
	}

	if len(manager.reserved) != 1 {
		t.Fatalf("expected one reservation, got %d", len(manager.reserved))
	}
	if manager.reserved[0].WorkDirAbs != filepath.Join(root, "work") {
		t.Fatalf("expected work dir %q, got %q", filepath.Join(root, "work"), manager.reserved[0].WorkDirAbs)
	}
	if manager.reserved[0].WorkDirRel != "work" {
		t.Fatalf("expected work dir rel work, got %q", manager.reserved[0].WorkDirRel)
	}
	if result.WorkingDir != "work" {
		t.Fatalf("expected result working dir work, got %q", result.WorkingDir)
	}
}

func TestStartCommandActionFromReviewFolderUsesParentSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "0", "review.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	manager := &fakeTerminalManager{}
	app := NewWithTerminal(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{}, manager)

	if _, err := app.OpenSession("work/0"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	if _, err := app.StartCommandAction("work/0", "work/0/review.jpg", "c", localize.EN); err != nil {
		t.Fatalf("start command action: %v", err)
	}

	if len(manager.reserved) != 1 {
		t.Fatalf("expected one reservation, got %d", len(manager.reserved))
	}
	if manager.reserved[0].WorkDirAbs != filepath.Join(root, "work") {
		t.Fatalf("expected review command to use parent work root, got %q", manager.reserved[0].WorkDirAbs)
	}
	if manager.reserved[0].WorkDirRel != "work" {
		t.Fatalf("expected review command to use rel work dir, got %q", manager.reserved[0].WorkDirRel)
	}
}

func TestPerformActionRejectsCommandActions(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "photo.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
	})
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	if _, err := app.PerformAction("work", "work/photo.jpg", "c", localize.EN); err == nil {
		t.Fatal("expected command action to be rejected on file action path")
	}
}

func TestOpenSessionFromTargetUsesParentAsSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "0", "review.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
	})
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	result, err := app.OpenSession("work/0")
	if err != nil {
		t.Fatalf("open session from target: %v", err)
	}

	if !result.Session.Active {
		t.Fatal("expected session to be active")
	}
	if result.Session.RootPath != "work" {
		t.Fatalf("expected session root to fall back to parent, got %q", result.Session.RootPath)
	}
	if result.SlideshowPath != "work/0" {
		t.Fatalf("expected slideshow to stay in current directory, got %q", result.SlideshowPath)
	}

	if _, err := app.PerformAction("work/0", "work/0/review.jpg", "arrowup", localize.EN); err != nil {
		t.Fatalf("restore photo from target: %v", err)
	}

	if _, err := os.Stat(filepath.Join(root, "work", "review.jpg")); err != nil {
		t.Fatalf("expected restored file in parent work root: %v", err)
	}
}

func TestBrowserMarksReviewStartFolders(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "0", "review.jpg"))
	mustWriteFile(t, filepath.Join(root, "work", "fresh", "photo.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	reviewData, err := app.Browser("work/0", localize.EN)
	if err != nil {
		t.Fatalf("browse review folder: %v", err)
	}
	if !reviewData.CurrentDirStartsAsReview {
		t.Fatal("expected target directory to be marked as a review start folder")
	}

	freshData, err := app.Browser("work/fresh", localize.EN)
	if err != nil {
		t.Fatalf("browse fresh folder: %v", err)
	}
	if freshData.CurrentDirStartsAsReview {
		t.Fatal("expected non-target directory not to be marked as a review start folder")
	}
}

func TestOpenSessionKeepsCurrentDirectoryWhenNotTarget(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "fresh", "photo.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	result, err := app.OpenSession("work/fresh")
	if err != nil {
		t.Fatalf("open session from non-target directory: %v", err)
	}
	if result.Session.RootPath != "work/fresh" {
		t.Fatalf("expected session root to stay on current directory, got %q", result.Session.RootPath)
	}
}

func TestOpenSessionDoesNotFallbackOutsideLaunchRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "photo.jpg"))

	cfg := config.Default()
	cfg.Actions = []config.ActionBinding{
		{Key: "delete", Action: "delete"},
		{Key: "arrowdown", Action: "move", Target: root},
		{Key: "arrowup", Action: "restore"},
	}
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	result, err := app.OpenSession("")
	if err != nil {
		t.Fatalf("open session from launch root: %v", err)
	}
	if result.Session.RootPath != "" {
		t.Fatalf("expected launch root session to stay put, got %q", result.Session.RootPath)
	}

	data, err := app.Browser("", localize.EN)
	if err != nil {
		t.Fatalf("browse launch root: %v", err)
	}
	if data.CurrentDirStartsAsReview {
		t.Fatal("expected launch root not to be marked as a review start folder")
	}
}

func TestSlideshowHidesCurrentReviewTargetAction(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "0", "review.jpg"))

	cfg := config.Default()
	cfg.Actions = []config.ActionBinding{
		{Key: "delete", Action: "delete"},
		{Key: "arrowdown", Action: "move", Target: "0"},
		{Key: "m", Action: "move", Target: "keep"},
		{Key: "arrowup", Action: "restore"},
	}
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work/0"); err != nil {
		t.Fatalf("open session from review target: %v", err)
	}

	data, err := app.Slideshow("work/0", localize.EN)
	if err != nil {
		t.Fatalf("load slideshow from review target: %v", err)
	}
	if !data.CurrentDirIsTarget {
		t.Fatal("expected review folder to be marked as target")
	}

	keys := make([]string, 0, len(data.ActionButtons))
	enabled := map[string]bool{}
	for _, action := range data.ActionButtons {
		keys = append(keys, action.Key)
		enabled[action.Key] = action.Enabled
	}

	if reflect.DeepEqual(keys, []string{}) {
		t.Fatal("expected some actions to remain visible")
	}
	if contains(keys, "arrowdown") {
		t.Fatalf("expected current target move action to be hidden, got %v", keys)
	}
	for _, key := range []string{"delete", "m", "arrowup"} {
		if !contains(keys, key) {
			t.Fatalf("expected action %q to remain visible, got %v", key, keys)
		}
	}
	if !enabled["arrowup"] {
		t.Fatal("expected restore to remain enabled in review folder")
	}
	if !enabled["m"] {
		t.Fatal("expected non-current move action to remain enabled in review folder")
	}
}

func TestBrowserEntryAlwaysEndsSessionWithoutNotice(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteFile(t, filepath.Join(root, "other", "b.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	data, err := app.Browser("work", localize.EN)
	if err != nil {
		t.Fatalf("browse work: %v", err)
	}

	if data.Session.Active {
		t.Fatal("expected browser entry to end the active session")
	}
	if data.Notice != "" {
		t.Fatalf("expected browser entry to end session silently, got %q", data.Notice)
	}
}

func TestTreeLookupOutsideSessionDoesNotEndSession(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteFile(t, filepath.Join(root, "other", "nested", "b.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	data, err := app.Tree("other")
	if err != nil {
		t.Fatalf("tree other: %v", err)
	}
	if len(data.Directories) != 1 || data.Directories[0].Name != "nested" {
		t.Fatalf("unexpected tree payload: %+v", data.Directories)
	}
	if !app.sessionInfoLocked().Active {
		t.Fatal("expected tree lookup to keep the session active")
	}
}

func TestBrowserCountsVisibleImagesWithinThreeLevels(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "cover.jpg"))
	mustWriteFile(t, filepath.Join(root, "work", "keep.png"))
	mustWriteFile(t, filepath.Join(root, "work", "notes.txt"))
	mustWriteFile(t, filepath.Join(root, "work", ".hidden.jpg"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", "inside.webp"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", ".ignored.bmp"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", "deeper", "last.bmp"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", "deeper", "deepest", "cap.jpg"))
	mustWriteFile(t, filepath.Join(root, "work", ".secret", "skip.jpg"))
	mustMkdir(t, filepath.Join(root, "work", "empty"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	data, err := app.Browser("work", localize.EN)
	if err != nil {
		t.Fatalf("browser: %v", err)
	}

	if data.CurrentPath != "work" {
		t.Fatalf("expected current path work, got %q", data.CurrentPath)
	}
	if data.CurrentImageCount != 5 {
		t.Fatalf("expected current image count 5, got %d", data.CurrentImageCount)
	}
	if data.CurrentImageCountEstimated {
		t.Fatal("expected current image count to remain exact within three levels")
	}
	if got := dirEntryByName(data.Directories, "nested"); got == nil {
		t.Fatal("expected nested directory entry")
	} else {
		if got.ImageCount != 3 {
			t.Fatalf("expected nested image count 3, got %d", got.ImageCount)
		}
		if got.ImageCountEstimated {
			t.Fatal("expected nested image count to remain exact within three levels")
		}
	}
	if got := dirEntryByName(data.Directories, "empty"); got == nil {
		t.Fatal("expected empty directory entry")
	} else {
		if got.ImageCount != 0 || got.ImageCountEstimated {
			t.Fatalf("expected empty directory count 0 exact, got %+v", *got)
		}
	}
}

func TestBrowserCountsMarkEstimatedWhenVisibleTreeGoesDeeperThanThreeLevels(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "root", "a.jpg"))
	mustWriteFile(t, filepath.Join(root, "root", "level1", "b.jpg"))
	mustWriteFile(t, filepath.Join(root, "root", "level1", "level2", "c.jpg"))
	mustWriteFile(t, filepath.Join(root, "root", "level1", "level2", "level3", "d.jpg"))
	mustWriteFile(t, filepath.Join(root, "root", "level1", "level2", "level3", "level4", "e.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	data, err := app.Browser("", localize.EN)
	if err != nil {
		t.Fatalf("browser root: %v", err)
	}

	rootEntry := dirEntryByName(data.Directories, "root")
	if rootEntry == nil {
		t.Fatal("expected root directory entry")
	}
	if rootEntry.ImageCount != 4 {
		t.Fatalf("expected depth-limited count 4, got %d", rootEntry.ImageCount)
	}
	if !rootEntry.ImageCountEstimated {
		t.Fatal("expected root directory count to be marked estimated")
	}

	tree, err := app.Tree("root")
	if err != nil {
		t.Fatalf("tree root: %v", err)
	}
	if tree.CurrentImageCount != 4 {
		t.Fatalf("expected current tree count 4, got %d", tree.CurrentImageCount)
	}
	if !tree.CurrentImageCountEstimated {
		t.Fatal("expected current tree count to be marked estimated")
	}
}

func TestBrowserCountsIgnoreHiddenDeepBranchesForEstimate(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "root", "cover.jpg"))
	mustWriteFile(t, filepath.Join(root, "root", "level1", "inside.jpg"))
	mustWriteFile(t, filepath.Join(root, "root", ".hidden", "level2", "level3", "level4", "deep.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	data, err := app.Browser("", localize.EN)
	if err != nil {
		t.Fatalf("browser root: %v", err)
	}

	rootEntry := dirEntryByName(data.Directories, "root")
	if rootEntry == nil {
		t.Fatal("expected root directory entry")
	}
	if rootEntry.ImageCount != 2 {
		t.Fatalf("expected hidden branch to be ignored, got count %d", rootEntry.ImageCount)
	}
	if rootEntry.ImageCountEstimated {
		t.Fatal("expected hidden deep branch not to mark estimate")
	}
}

func TestMoveAutoRenamesOnConflict(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "photo.jpg"))
	mustWriteFile(t, filepath.Join(root, "0", "photo.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession(""); err != nil {
		t.Fatalf("open session: %v", err)
	}
	if _, err := app.PerformAction("", "photo.jpg", "arrowdown", localize.EN); err != nil {
		t.Fatalf("move photo: %v", err)
	}

	if _, err := os.Stat(filepath.Join(root, "0", "photo (1).jpg")); err != nil {
		t.Fatalf("expected renamed target: %v", err)
	}
}

func TestNaturalNameLessSortsNumericSegments(t *testing.T) {
	names := []string{
		"10",
		"2",
		"1",
		"02",
		"a10",
		"a2",
		"2026-03-10",
		"2026-03-2",
	}

	sort.Slice(names, func(i, j int) bool {
		return naturalNameLess(names[i], names[j])
	})

	want := []string{
		"1",
		"2",
		"02",
		"10",
		"2026-03-2",
		"2026-03-10",
		"a2",
		"a10",
	}
	if !reflect.DeepEqual(names, want) {
		t.Fatalf("unexpected natural sort order: got %v want %v", names, want)
	}
}

func TestBrowserAndTreeUseNaturalDirectoryOrder(t *testing.T) {
	root := t.TempDir()
	for _, dir := range []string{
		"10",
		"2",
		"1",
		filepath.Join("tree", "10"),
		filepath.Join("tree", "2"),
		filepath.Join("tree", "1"),
	} {
		mustMkdir(t, filepath.Join(root, dir))
	}

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	browserData, err := app.Browser("", localize.EN)
	if err != nil {
		t.Fatalf("browse root: %v", err)
	}
	if got := dirNames(browserData.Directories); !reflect.DeepEqual(got, []string{"1", "2", "10", "tree"}) {
		t.Fatalf("unexpected browser directory order: %v", got)
	}

	treeData, err := app.Tree("tree")
	if err != nil {
		t.Fatalf("tree browse: %v", err)
	}
	if got := dirNames(treeData.Directories); !reflect.DeepEqual(got, []string{"1", "2", "10"}) {
		t.Fatalf("unexpected tree directory order: %v", got)
	}
}

func TestLocalizedBreadcrumbsActionLabelsAndNotices(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "photo.jpg"))
	mustWriteFile(t, filepath.Join(root, "other", "keep.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
		Alias:   "Python",
	})
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	browserData, err := app.Browser("work", localize.ZHCN)
	if err != nil {
		t.Fatalf("browse work: %v", err)
	}
	if len(browserData.Breadcrumbs) == 0 || browserData.Breadcrumbs[0].Name != "浏览起点" {
		t.Fatalf("expected zh root breadcrumb, got %+v", browserData.Breadcrumbs)
	}

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	slideshowData, err := app.Slideshow("work", localize.ZHCN)
	if err != nil {
		t.Fatalf("load slideshow: %v", err)
	}
	labels := map[string]string{}
	for _, action := range slideshowData.ActionButtons {
		labels[action.Key] = action.Label
	}
	if labels["delete"] != "删除" {
		t.Fatalf("expected localized delete label, got %q", labels["delete"])
	}
	if labels["arrowdown"] != "0" {
		t.Fatalf("expected localized move label, got %q", labels["arrowdown"])
	}
	if labels["arrowup"] != "恢复" {
		t.Fatalf("expected localized restore label, got %q", labels["arrowup"])
	}
	if labels["c"] != "Python" {
		t.Fatalf("expected localized command label, got %q", labels["c"])
	}

	result, err := app.PerformAction("work", "work/photo.jpg", "arrowdown", localize.ZHCN)
	if err != nil {
		t.Fatalf("move photo: %v", err)
	}
	if result.Notice != "已移动 photo.jpg。" {
		t.Fatalf("expected localized move notice, got %q", result.Notice)
	}

	autoEndData, err := app.Slideshow("other", localize.ZHCN)
	if err != nil {
		t.Fatalf("load slideshow outside session root: %v", err)
	}
	if autoEndData.Notice != "已离开当前整理范围，整理已自动结束。" {
		t.Fatalf("expected localized auto-end notice, got %q", autoEndData.Notice)
	}
}

func TestMoveLabelFallsBackWithoutAliasForLegacyConfig(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "photo.jpg"))

	cfg := config.Default()
	cfg.Actions[1].Alias = ""
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	slideshowData, err := app.Slideshow("work", localize.ZHCN)
	if err != nil {
		t.Fatalf("load slideshow: %v", err)
	}

	labels := map[string]string{}
	for _, action := range slideshowData.ActionButtons {
		labels[action.Key] = action.Label
	}
	if labels["arrowdown"] != "移动到 0" {
		t.Fatalf("expected legacy move label fallback, got %q", labels["arrowdown"])
	}
}

func TestCommandLabelFallsBackWithoutAliasForLegacyConfig(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "photo.jpg"))

	cfg := config.Default()
	cfg.Actions = append(cfg.Actions, config.ActionBinding{
		Key:     "c",
		Action:  "command",
		Command: "python script.py",
	})
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	slideshowData, err := app.Slideshow("work", localize.ZHCN)
	if err != nil {
		t.Fatalf("load slideshow: %v", err)
	}

	labels := map[string]string{}
	for _, action := range slideshowData.ActionButtons {
		labels[action.Key] = action.Label
	}
	if labels["c"] != "执行命令" {
		t.Fatalf("expected legacy command label fallback, got %q", labels["c"])
	}

	startResult, err := app.StartCommandAction("work", "work/photo.jpg", "c", localize.ZHCN)
	if err != nil {
		t.Fatalf("start command action: %v", err)
	}
	if startResult.Title != "执行命令" {
		t.Fatalf("expected legacy command title fallback, got %q", startResult.Title)
	}
}

func mustWriteFile(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
	if err := os.WriteFile(path, []byte("x"), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}

func mustMkdir(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", path, err)
	}
}

func dirNames(entries []DirEntry) []string {
	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		names = append(names, entry.Name)
	}
	return names
}

func dirEntryByName(entries []DirEntry, want string) *DirEntry {
	for i := range entries {
		if entries[i].Name == want {
			return &entries[i]
		}
	}
	return nil
}

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}
