package app

import (
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"testing"

	"github.com/nemo1105/photo-manager/internal/config"
	"github.com/nemo1105/photo-manager/internal/localize"
)

type fakeTrash struct {
	paths []string
}

func (f *fakeTrash) Trash(path string) error {
	f.paths = append(f.paths, path)
	return os.Remove(path)
}

func TestMoveAndRestoreUseSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "photo.jpg"))

	cfg := config.Default()
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

func TestOpenSessionFromTargetUsesParentAsSessionRoot(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "0", "review.jpg"))

	cfg := config.Default()
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

func TestBrowserStatsCountsVisibleRecursiveImages(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "cover.jpg"))
	mustWriteFile(t, filepath.Join(root, "work", "keep.png"))
	mustWriteFile(t, filepath.Join(root, "work", "notes.txt"))
	mustWriteFile(t, filepath.Join(root, "work", ".hidden.jpg"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", "inside.webp"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", ".ignored.bmp"))
	mustWriteFile(t, filepath.Join(root, "work", "nested", "deeper", "last.bmp"))
	mustWriteFile(t, filepath.Join(root, "work", ".secret", "skip.jpg"))
	mustMkdir(t, filepath.Join(root, "work", "empty"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	stats, err := app.BrowserStats("work")
	if err != nil {
		t.Fatalf("browser stats: %v", err)
	}

	if stats.CurrentPath != "work" {
		t.Fatalf("expected current path work, got %q", stats.CurrentPath)
	}
	if stats.DirectoryCount != 2 {
		t.Fatalf("expected 2 visible child directories, got %d", stats.DirectoryCount)
	}
	if stats.ImageCount != 2 {
		t.Fatalf("expected 2 visible direct images, got %d", stats.ImageCount)
	}
	if stats.RecursiveImageCount != 4 {
		t.Fatalf("expected 4 visible recursive images, got %d", stats.RecursiveImageCount)
	}
}

func TestBrowserStatsOutsideSessionDoesNotEndSession(t *testing.T) {
	root := t.TempDir()
	mustWriteFile(t, filepath.Join(root, "work", "a.jpg"))
	mustWriteFile(t, filepath.Join(root, "other", "nested", "b.jpg"))

	cfg := config.Default()
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	if _, err := app.OpenSession("work"); err != nil {
		t.Fatalf("open session: %v", err)
	}

	stats, err := app.BrowserStats("other")
	if err != nil {
		t.Fatalf("browser stats: %v", err)
	}
	if stats.RecursiveImageCount != 1 {
		t.Fatalf("expected recursive image count 1, got %d", stats.RecursiveImageCount)
	}
	if !app.sessionInfoLocked().Active {
		t.Fatal("expected browser stats lookup to keep the session active")
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
	app := New(root, filepath.Join(root, "config.yaml"), cfg, &fakeTrash{})

	browserData, err := app.Browser("work", localize.ZHCN)
	if err != nil {
		t.Fatalf("browse work: %v", err)
	}
	if len(browserData.Breadcrumbs) == 0 || browserData.Breadcrumbs[0].Name != "根目录" {
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
	if labels["arrowdown"] != "移动到 0" {
		t.Fatalf("expected localized move label, got %q", labels["arrowdown"])
	}
	if labels["arrowup"] != "恢复" {
		t.Fatalf("expected localized restore label, got %q", labels["arrowup"])
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
	if autoEndData.Notice != "已离开当前工作目录范围，会话已自动结束。" {
		t.Fatalf("expected localized auto-end notice, got %q", autoEndData.Notice)
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

func contains(items []string, want string) bool {
	for _, item := range items {
		if item == want {
			return true
		}
	}
	return false
}
