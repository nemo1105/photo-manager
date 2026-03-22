# UI And Sorting Follow-Ups Plan

Last updated: 2026-03-22
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
- [ ] Prevent repeated operations on stale slideshow state from surfacing as user-visible errors.
- [ ] Make the settings key-capture state more obvious while waiting for the next key press.

## Risks

- Repeated-action protection may need both frontend request gating and backend state validation to avoid race-dependent user errors.
- The keyboard-capture UX spans render, focus, and localization paths, so it is easy to improve visually without making the actual capture state clearer.
- Directory-row image counts recurse up to 3 levels for every visible folder row, so large expanded trees still need manual runtime verification for browse responsiveness.
- Interactive terminal behavior still depends on platform-specific PTY behavior, so Windows and macOS runtime verification remains necessary even when backend tests pass.

## Decisions

- `todo.md` remains a scratch pad, but the canonical status for these follow-ups now lives in this plan.
- This is a `Plan class: Standard` document because the work is active but still routine and bounded.
- Browser mode and active work sessions are mutually exclusive. Loading browser mode, including refresh, silently ends any active session instead of preserving mixed state.
- User-facing language is task-first: `整理 / Sort`, `复查 / Review`, `文件夹浏览 / Folder browsing`, and `整理界面 / Sorting view`. Internal `session` terminology remains code-level only.
- Browser settings entry is explicit through the help modal header button; folder browsing no longer reserves a dedicated settings shortcut.
- Directory rows show bounded image counts from the existing browser/tree payloads, with a 3-level scan cap and an estimate marker for deeper visible subtrees.
- `command` actions run as raw shell text with no placeholder DSL or injected current-image/current-directory variables; the only guaranteed execution context is the initial `sessionRoot` working directory.
- `alias` is the user-facing label for move and command actions. Legacy configs without it may load, but save remains blocked until the alias is filled.

## Verification

- Run `go test ./...` and `go build ./...` when code changes accompany this plan.
- Verify `zh-CN` and `en` both localize browser chrome, help, settings, preview, sorting-view copy, and backend notice / error responses.
- Verify refreshing or reopening browser mode during an active slideshow ends the session silently and does not surface browser-side active-session controls.
- Verify the directory tree shows right-aligned image counts for the browse root and visible folder rows, with an estimate marker when deeper visible subfolders exceed the 3-level scan cap.
- Verify browser help and settings no longer surface `up_dir`, browser-side `end_session`, or browser-side `open_settings`, and `/api/browser` omits `parentPath` and `canGoUp`.
- Verify `command` opens an interactive full-screen terminal, starts in the sort-starting folder even from review mode, and still delivers trailing output before the terminal reports exit.
- Verify move and command aliases render directly in sorting-facing UI and the command terminal title, while legacy configs without aliases still fail save until corrected.

## Next update trigger

- Update this plan when any task starts, changes scope, is verified complete, or is replaced by a more detailed execution plan.
