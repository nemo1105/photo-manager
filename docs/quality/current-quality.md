# Current Quality

Last updated: 2026-04-05
Status: active

## Quality goals

- Keep path handling and file operations contained inside `launchRoot`, except when the user explicitly configured an absolute move target.
- Keep sorting semantics anchored to `sessionRoot`, including review-folder entry, restore behavior, and command working-directory selection.
- Keep browser and sorting states unambiguous: browser mode must not preserve an active session, and sorting actions must stay available by both keyboard and visible buttons.
- Keep browser-mode single-image actions constrained and explicit: the browse-gallery overflow menu must not start sorting and delete must still use the recycle bin / Trash.
- Keep browser-mode single-folder actions explicit and bounded: tree-row actions must target the selected folder, root-folder actions must stay blocked, and folder delete must always require confirmation.
- Keep the browser tree predictable and bounded: natural directory ordering, keyboard/tree behavior alignment, and image counts capped at 3 descendant levels with explicit estimate marking.
- Keep folder browsing responsive while directories load: the tree should remain clickable, the latest target should win, stale responses must not restore older content, and the gallery should not keep showing the previous folder once a new load starts.
- Keep directory decorations lightweight and isolated: browser/tree status icons should remain localized, should not bubble unexpectedly across folders, and must not break browsing when a decorator fails.
- Keep folder-browsing image cards aligned to decoded image ratios so mixed portrait and landscape folders do not waste large thumbnail areas on empty frame space.
- Keep user-facing copy consistent within the selected locale and centered on sorting/review terminology rather than internal implementation terms.
- Keep the command-terminal flow modal and ordered so terminal input does not leak back to sorting and fast-exiting commands still show their final output before exit.
- Keep move and command aliases consistent across sorting-facing UI while still tolerating legacy configs until the next save.

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
  - Session-root-based `command` working directory selection.
  - Review-folder slideshow filtering that hides the current target move action while keeping restore and other actions available there, and hides restore entirely outside target folders.
  - Ending sessions when browser mode is loaded, and auto-ending sessions when slideshow/action requests leave the session subtree.
  - Directory and current-node image counts in browser/tree payloads, including the 3-level scan cap, hidden-entry filtering, unsupported-file filtering, and estimate marking for deeper visible branches.
  - Built-in directory decorations in browser/tree payloads, including the `done.txt` marker, request-localized tooltips, per-directory-only scope, and failure isolation when one decorator errors.
  - Auto-renaming on target conflicts.
  - Silent loading and save-time cleanup of legacy `browser.end_session`, `browser.up_dir`, `browser.open_settings`, and `slideshow.back_to_browser` config fields.
  - Browser handler responses omitting legacy `parentPath` and `canGoUp` fields after the parent-navigation simplification.
  - Legacy config loading after removing the slideshow back-to-browser binding.
  - Request-locale parsing for `X-Photo-Manager-Locale` and `Accept-Language`.
  - Localized breadcrumbs, action labels, notices, and validation-error responses in `zh-CN`.
  - Command-action config validation, reservation start path, and WebSocket output/exit streaming, including the fast-exit case where trailing output must arrive before the exit frame and the Windows-style PTY close path where `The pipe has been ended.` must not be surfaced as a terminal failure after a normal exit.
  - Move/command alias validation, including strict save-time requirement, legacy load compatibility, and alias rejection on delete/restore actions.
  - Alias-based move and command labels in slideshow data, plus alias-based terminal titles in command-start responses.
  - Task-first user terminology across UI dictionaries, backend notices, and settings validation labels.
  - Windows PowerShell path quoting for recycle-bin deletion.
  - Browser-mode single-image delete without an active session.
  - Browser-mode `browser_actions[]` validation, including browser-key conflicts, supported-type limits, and the default folder-delete template.
  - Browser-mode selected-folder `move` and `delete`, including parent-relative target resolution, conflict renaming, root-folder blocking, move-into-self rejection, and optimistic post-action navigation to next sibling, otherwise previous sibling, otherwise parent.
  - Browser-folder handler responses, including localized notices and root-folder rejection.
- Missing coverage:
  - Browser-side UI flows in the static frontend bundle under `internal/web/static/app.js` and `internal/web/static/app/`.
  - Automated browser verification that the browse-gallery overflow menu opens from the bottom-right trigger, dismisses on outside click, and refreshes masonry layout after delete.
  - Automated browser verification that the selected tree row shows the folder-action trigger only on hover, shifts the count badge only for that hover state, and keeps the trigger hidden during pure keyboard navigation.
  - Automated browser verification that browser folder-action hotkeys target the selected tree row instead of the currently opened photo pane.
  - Automated browser verification that browser folder delete always shows a confirmation prompt before the request is sent.
  - Automated browser verification that rapid tree clicks and debounced keyboard scans follow latest-request-wins browse loading, clear the gallery into a loading state, and suppress stale request errors.
  - Automated browser verification that deeper browser-tree levels keep increasing indentation instead of visually collapsing onto the same column.
  - Automated browser verification that tree decoration chips stay aligned with folder labels and counts across current, ancestor, and collapsed states.
  - Automated browser verification that move and command aliases render in the sorting footer and help modal, and that command aliases render in the command terminal title.
- Layout verification that browser mode keeps the tree and image list inside the viewport without a large header shell.
- Manual verification that browse-gallery masonry sizing stays stable across mixed orientations, lazy image loads, and window resizes without horizontal overflow.
- Layout verification that slideshow mode stays scrollbar-free at runtime.
  - Manual verification that the regrouped help modal keeps its two-column shortcut layout and header actions readable across browser widths.
  - Manual verification that directory-tree count badges and decoration chips stay aligned and refresh after sorting actions or `done.txt` marker changes.
  - Manual verification that hovering and clicking through the tree during gallery loads no longer causes row flashing, and that the latest clicked folder remains selected until its response arrives or is superseded.
  - Manual verification that the selected-row folder-action trigger appears only on mouse hover, that the count shifts left only for that hover state, and that the popup dismisses correctly on outside click.
  - Manual verification that refreshing during slideshow ends the session and reopens browser mode without browser-side active-session controls.
  - End-to-end verification of delete-to-recycle-bin behavior.
  - End-to-end verification of folder delete-to-recycle-bin behavior with the runtime confirmation dialog.
  - Browser-storage persistence and no-reload locale switching in the live UI.
  - Repeated-action protection for stale slideshow state.
  - Settings capture-state UX, explicit settings-entry flow, and config-edit browser flows.
  - Manual runtime verification of the full-screen interactive command terminal with real shell programs.

## Debt and follow-ups

- The frontend now uses split static JS/CSS modules, but it still has no automated UI test harness.
- Legacy configs that still omit `alias` on move or command actions can load but will be blocked on the next settings save until the alias is added.
- `todo.md` still exists as a scratch pad, so future changes should continue moving durable truth into `docs/` instead of expanding that file.
