# UI And Sorting Follow-Ups Plan

Last updated: 2026-04-05
Status: active
Plan class: Standard

## Goal

Track the remaining UI and reliability work after the browse/preview/sorting flow refresh, with emphasis on preventing misuse and closing the most visible UX gaps.

## Tasks

- [x] Refresh the browser, preview, and sorting surfaces so browsing and sorting are visually distinct and the sorting view stays immersive.
- [x] Replace the flat folder list with a keyboard-driven tree that uses natural sorting, bounded per-directory image counts, and a dedicated `GET /api/tree` path for tree expansion.
- [x] Remove obsolete navigation and session affordances so browser mode no longer exposes `up_dir`, browser-side `end_session`, or browser-side `open_settings`, and `/api/browser` no longer carries `parentPath` or `canGoUp`.
- [x] Split the frontend into smaller JS and CSS modules without changing the workflow contract.
- [x] Add zh-CN / en localization with browser-local language override and task-first user-facing terminology.
- [x] Add interactive `command` actions with alias-based labels, one active terminal session at a time, and stable output-before-exit delivery.
- [x] Add shell-quoted `{{currentFile}}` placeholder expansion for `command` actions while keeping `sessionRoot` as the terminal working directory.
- [x] Preserve literal `{{currentFile}}` examples in localized settings copy and let command inputs stretch within the row without squeezing the action buttons.
- [x] Rework the folder-browsing gallery into an aspect-ratio-aware masonry layout that uses loaded image dimensions, keeps images uncropped, and treats `350 px` portrait-width / landscape-height targets as soft goals when space allows.
- [x] Add a per-photo overflow menu on browse-gallery cards with browser-mode single-image delete routed through the recycle bin / Trash without starting sorting.
- [x] Add browser-mode folder actions with a work-action-shaped `browser_actions[]` config, hover-only tree-row overflow menus, selected-row hotkeys, parent-relative folder moves, and confirmed folder delete.
- [x] Restore visible indentation progression for deeper levels in the browser tree so third-level folders no longer visually collapse onto second-level rows.
- [x] Add an internal directory-decoration plugin path for browser-tree status icons, including a built-in `done.txt` green check marker with locale-aware tooltips.
- [x] Keep folder browsing interactive during directory loads so the latest mouse or keyboard target wins, the target row shows a light loading marker, the gallery switches to a loading state, and stale responses or stale errors do not roll the UI back.
- [ ] Prevent repeated operations on stale slideshow state from surfacing as user-visible errors.
- [ ] Make the settings key-capture state more obvious while waiting for the next key press.

## Risks

- Repeated-action protection may need both frontend request gating and backend state validation to avoid race-dependent user errors.
- The keyboard-capture UX spans render, focus, and localization paths, so it is easy to improve visually without making the actual capture state clearer.
- Directory-row image counts recurse up to 3 levels for every visible folder row, so large expanded trees still need manual runtime verification for browse responsiveness.
- Interactive terminal behavior still depends on platform-specific PTY behavior, so Windows and macOS runtime verification remains necessary even when backend tests pass.
- `{{currentFile}}` expansion now depends on PowerShell and POSIX shell quoting rules staying aligned with the command transport on each platform.
- The browse gallery now measures layout from browser-decoded image dimensions at runtime, so mixed portrait/panorama folders still need manual verification across resize breakpoints.
- The new browse-card overflow menu needs manual verification for click-away dismissal, mobile hit targets, and delete feedback after masonry relayout.
- The new tree-row folder-action menu needs manual verification for hover-only visibility, count-badge movement, and confirmation flow before folder delete.
- Tree decorations currently ship without automated browser UI coverage, so multi-icon alignment and selected-row readability still need live verification.

## Decisions

- `todo.md` remains a scratch pad, but the canonical status for these follow-ups now lives in this plan.
- This is a `Plan class: Standard` document because the work is active but still routine and bounded.
- Browser mode and active work sessions are mutually exclusive. Loading browser mode, including refresh, silently ends any active session instead of preserving mixed state.
- User-facing language is task-first: `整理 / Sort`, `复查 / Review`, `文件夹浏览 / Folder browsing`, and `整理界面 / Sorting view`. Internal `session` terminology remains code-level only.
- Browser settings entry is explicit through the help modal header button; folder browsing no longer reserves a dedicated settings shortcut.
- Directory rows show bounded image counts from the existing browser/tree payloads, with a 3-level scan cap and an estimate marker for deeper visible subtrees.
- Directory status icons now ride on the existing browser/tree payloads through an internal decorator registry; v1 uses a localized `done-marker` for folders that directly contain `done.txt`.
- Browser directory loads now use a latest-request-wins UI state: the tree stays clickable, the newest target row stays selected, the gallery clears to a loading state once the request starts, and stale responses or superseded request failures are ignored.
- Browser-mode folder actions use a dedicated `browser_actions[]` list that mirrors the sorting action object shape for custom moves, while fixed folder delete now lives under `keys.browser.delete_selected`.
- `command` actions run as raw shell text with exactly one built-in token, `{{currentFile}}`, which expands to the selected image's shell-quoted absolute path; the only guaranteed execution context is still the initial `sessionRoot` working directory.
- `alias` is the user-facing label for move and command actions. Legacy configs without it may load, but save remains blocked until the alias is filled.

## Verification

- Run `go test ./...` and `go build ./...` when code changes accompany this plan.
- Verify `zh-CN` and `en` both localize browser chrome, help, settings, preview, sorting-view copy, and backend notice / error responses.
- Verify mixed portrait, square, landscape, and panorama folders render with full-image masonry cards, avoid large thumbnail whitespace, and relax the `350 px` target cleanly on narrow widths instead of overflowing horizontally.
- Verify browse-gallery cards show a bottom-right overflow trigger, the popup offers `Delete`, and deleting from browser mode sends the file to the recycle bin / Trash without starting sorting.
- Verify hovered tree rows show a hover-only overflow trigger, the popup offers configured folder actions plus `Delete`, folder delete asks for confirmation, and successful folder actions jump to the next visible sibling folder, otherwise the previous sibling, otherwise the parent.
- Verify refreshing or reopening browser mode during an active slideshow ends the session silently and does not surface browser-side active-session controls.
- Verify the directory tree shows right-aligned image counts for the browse root and visible folder rows, with an estimate marker when deeper visible subfolders exceed the 3-level scan cap.
- Verify second- and third-level folders in browser mode render with distinct indentation so nesting remains readable in deeper trees.
- Verify adding or removing `done.txt` changes the tree decoration after the next browser or tree refresh, and verify the green check stays aligned with counts and selected-row styling.
- Verify rapid tree clicks and debounced keyboard scans keep the latest target selected, keep the tree clickable, switch the gallery to a loading state instead of showing stale photos, and avoid stale error toasts or hover flashing.
- Verify browser help and settings no longer surface `up_dir`, browser-side `end_session`, or browser-side `open_settings`, and `/api/browser` omits `parentPath` and `canGoUp`.
- Verify `command` opens an interactive full-screen terminal, starts in the sort-starting folder even from review mode, expands `{{currentFile}}` to the selected image path, and still delivers trailing output before the terminal reports exit.
- Verify move and command aliases render directly in sorting-facing UI and the command terminal title, while legacy configs without aliases still fail save until corrected.

## Next update trigger

- Update this plan when any task starts, changes scope, is verified complete, or is replaced by a more detailed execution plan.
