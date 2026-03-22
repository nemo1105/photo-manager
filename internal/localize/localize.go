package localize

import (
	"fmt"
	"net/http"
	"strings"
)

type Locale string

const (
	EN   Locale = "en"
	ZHCN Locale = "zh-CN"
)

type UserMessager interface {
	error
	UserMessage(Locale) string
}

type StaticError struct {
	en string
	zh string
}

func NewStaticError(en, zh string) *StaticError {
	return &StaticError{
		en: en,
		zh: zh,
	}
}

func (e *StaticError) Error() string {
	if e == nil {
		return ""
	}
	return e.en
}

func (e *StaticError) UserMessage(locale Locale) string {
	if e == nil {
		return ""
	}
	return choose(locale, e.en, e.zh)
}

func Normalize(raw string) Locale {
	locale, ok := ParseOne(raw)
	if !ok {
		return EN
	}
	return locale
}

func ParseOne(raw string) (Locale, bool) {
	token := normalizeToken(raw)
	if token == "" {
		return "", false
	}
	switch {
	case strings.HasPrefix(token, "zh"):
		return ZHCN, true
	case strings.HasPrefix(token, "en"):
		return EN, true
	default:
		return "", false
	}
}

func FromRequest(r *http.Request) Locale {
	if r == nil {
		return EN
	}
	if locale, ok := ParseOne(r.Header.Get("X-Photo-Manager-Locale")); ok {
		return locale
	}
	for _, part := range strings.Split(r.Header.Get("Accept-Language"), ",") {
		if locale, ok := ParseOne(part); ok {
			return locale
		}
	}
	return EN
}

func RootName(locale Locale) string {
	return choose(locale, "Browse Root", "浏览起点")
}

func InvalidRequest(locale Locale) string {
	return choose(locale, "Invalid request.", "请求无效。")
}

func NotFound(locale Locale) string {
	return choose(locale, "Could not find that folder or photo.", "找不到这个文件夹或图片。")
}

func UnexpectedError(locale Locale) string {
	return choose(locale, "Something went wrong. Please try again.", "发生了未知错误，请重试。")
}

func ReviewStartNotice(locale Locale) string {
	return choose(locale, "This folder already contains sorted photos. Review them here.", "这个文件夹里已经有整理过的图片，可以直接在这里复查。")
}

func DoneMarkerTooltip(locale Locale) string {
	return choose(locale, "Marked done by done.txt", "已由 done.txt 标记为完成")
}

func SessionAutoEndedNotice(locale Locale) string {
	return choose(locale, "You left the current sorting range. Sorting ended automatically.", "已离开当前整理范围，整理已自动结束。")
}

func MoveNotice(locale Locale, name string) string {
	return choose(locale, fmt.Sprintf("Moved %s.", name), fmt.Sprintf("已移动 %s。", name))
}

func DeleteNotice(locale Locale, name string) string {
	return choose(locale, fmt.Sprintf("Deleted %s to recycle bin.", name), fmt.Sprintf("已将 %s 移到回收站。", name))
}

func RestoreNotice(locale Locale, name string) string {
	return choose(locale, fmt.Sprintf("Restored %s.", name), fmt.Sprintf("已恢复 %s。", name))
}

func ActionLabel(locale Locale, action, target, alias string) string {
	switch action {
	case "move":
		if strings.TrimSpace(alias) != "" {
			return strings.TrimSpace(alias)
		}
		if locale == ZHCN {
			return fmt.Sprintf("移动到 %s", target)
		}
		return "Move to " + target
	case "delete":
		return ActionName(locale, action)
	case "restore":
		return ActionName(locale, action)
	case "command":
		if strings.TrimSpace(alias) != "" {
			return strings.TrimSpace(alias)
		}
		return ActionName(locale, action)
	default:
		return action
	}
}

func ActionName(locale Locale, action string) string {
	switch action {
	case "move":
		return choose(locale, "Move", "移动")
	case "delete":
		return choose(locale, "Delete", "删除")
	case "restore":
		return choose(locale, "Restore", "恢复")
	case "command":
		return choose(locale, "Run Command", "执行命令")
	default:
		return action
	}
}

func choose(locale Locale, en, zh string) string {
	if locale == ZHCN {
		return zh
	}
	return en
}

func normalizeToken(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	raw = strings.SplitN(raw, ";", 2)[0]
	raw = strings.ReplaceAll(raw, "_", "-")
	return strings.ToLower(strings.TrimSpace(raw))
}
