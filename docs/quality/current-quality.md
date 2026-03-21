# Current Quality

Last updated: 2026-03-21
Status: active

## Quality goals

- Keep all file-system operations contained inside the launch root unless the user explicitly configured an absolute move target.
- Make session-root-based sorting predictable enough that review and restore never depend on the current image's parent folder.
- Make review-folder entry explicit from the user's point of view, so moved-photo checks do not expose session-root internals.
- Prevent review folders from surfacing a redundant self-target move action in slideshow.
- Keep transient feedback in a single animated bottom-right toast pattern instead of mixing inline hints with overlays.
- Keep image actions available both by keyboard and by visible buttons.
- Preserve platform-native recycle-bin / Trash behavior for deletes.
- Keep slideshow mode visually immersive, chrome-light, and free of browser-level scrollbars in common desktop window sizes.
- Keep browser mode compact enough that the tree and image list own the viewport instead of a persistent header shell.
- Keep browser-mode chrome reduced to a single primary sort action plus a help affordance, with low-frequency details moved behind the help panel.
- Keep browser mode and active slideshow sessions mutually exclusive so refresh or direct browser entry cannot strand the UI in a half-active session state.
- Keep help-modal guidance unambiguous by naming arrow keys explicitly, separating shortcuts by mode, and treating `Space` as browser start plus slideshow exit rather than documenting a browser-side end-session key.
- Keep browser parent navigation singular and predictable by using only collapse / parent behavior instead of a redundant second "go up" shortcut.
- Keep the browser transport contract aligned with that model, so `/api/browser` does not keep shipping stale parent-navigation fields that the UI no longer uses.
- Keep browser directory ordering human-readable, especially for numbered folders and dated folder names.
- Keep browser-mode tree navigation usable by keyboard alone, with directional keys and visible-button behavior staying aligned.
- Keep rapid keyboard directory scans responsive by avoiding unintended auto-expansion and by debouncing browser reloads before image-heavy panes redraw.
- Keep help-modal summary stats compact while still exposing direct and recursive image counts without mutating session state.
- Keep browser-visible copy consistent within the selected locale so static UI, server notices, and validation errors do not mix English and Chinese in the same flow.
- Keep user-facing language centered on sorting and reviewing photos, not on internal implementation concepts like session, workspace, browser, slideshow, or capture.

## Known issues

- P1 bug: the same image can still be acted on twice from stale UI state, which produces an avoidable error on the second request.
- P1 bug: settings key capture does not expose a strong enough waiting state in the UI.
- P1 test gap: the dark browser shell still has no automated visual regression coverage.

## Test coverage

- Existing coverage:
  - Config normalization and key-conflict validation.
  - Default shortcut template for browser, slideshow, and action keys.
  - Session-root-based `move` and `restore` behavior.
  - Session-start fallback from target folders to the parent work root.
  - Review-folder slideshow filtering that hides the current target move action while keeping restore and other actions available.
  - Ending sessions when browser mode is loaded, and auto-ending sessions when slideshow/action requests leave the session subtree.
  - Side-effect-free browser help stats counts, including recursive image totals that ignore hidden entries and unsupported files.
  - Auto-renaming on target conflicts.
  - Silent loading and save-time cleanup of legacy `browser.end_session`, `browser.up_dir`, and `slideshow.back_to_browser` config fields.
  - Browser handler responses omitting legacy `parentPath` and `canGoUp` fields after the parent-navigation simplification.
  - Legacy config loading after removing the slideshow back-to-browser binding.
  - Request-locale parsing for `X-Photo-Manager-Locale` and `Accept-Language`.
  - Localized breadcrumbs, action labels, notices, and validation-error responses in `zh-CN`.
  - Task-first user terminology across UI dictionaries, backend notices, and settings validation labels.
  - Windows PowerShell path quoting for recycle-bin deletion.
- Missing coverage:
  - Browser-side UI flows in `internal/web/static/app.js`.
  - Layout verification that browser mode keeps the tree and image list inside the viewport without a large header shell.
  - Layout verification that slideshow mode stays scrollbar-free at runtime.
  - Manual verification that the regrouped help modal keeps header actions, shortcut cards, and compact stats readable on smaller browser widths.
  - Manual verification that refreshing during slideshow ends the session and reopens browser mode without browser-side active-session controls.
  - End-to-end verification of delete-to-recycle-bin behavior.
  - Browser-storage persistence and no-reload locale switching in the live UI.
  - Repeated-action protection for stale slideshow state.
  - Settings capture-state UX and config-edit browser flows.

## Debt and follow-ups

- The frontend currently lives in one large `app.js` file with no automated UI tests.
- `todo.md` still exists as a scratch pad, so future changes should continue moving durable truth into `docs/` instead of expanding that file.
