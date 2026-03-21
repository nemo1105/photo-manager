package localize

import (
	"net/http/httptest"
	"testing"
)

func TestFromRequestPrefersExplicitLocaleHeader(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Photo-Manager-Locale", "zh-CN")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")

	if got := FromRequest(req); got != ZHCN {
		t.Fatalf("expected zh-CN, got %q", got)
	}
}

func TestFromRequestFallsBackToAcceptLanguage(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Language", "fr-FR, zh-TW;q=0.9, en;q=0.8")

	if got := FromRequest(req); got != ZHCN {
		t.Fatalf("expected zh-CN, got %q", got)
	}
}

func TestFromRequestDefaultsToEnglish(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Accept-Language", "fr-FR, de-DE;q=0.8")

	if got := FromRequest(req); got != EN {
		t.Fatalf("expected en, got %q", got)
	}
}

func TestTaskLanguageHelpers(t *testing.T) {
	if got := RootName(ZHCN); got != "浏览起点" {
		t.Fatalf("unexpected zh root name: %q", got)
	}
	if got := ReviewStartNotice(EN); got != "This folder already contains sorted photos. Review them here." {
		t.Fatalf("unexpected review notice: %q", got)
	}
	if got := SessionAutoEndedNotice(ZHCN); got != "已离开当前整理范围，整理已自动结束。" {
		t.Fatalf("unexpected zh auto-end notice: %q", got)
	}
}
