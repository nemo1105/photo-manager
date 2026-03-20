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
- Keep browser directory ordering human-readable, especially for numbered folders and dated folder names.

## Known issues

- P1 product gap: the UI does not support Chinese/English switching yet.
- P1 bug: the same image can still be acted on twice from stale UI state, which produces an avoidable error on the second request.
- P1 bug: settings key capture does not expose a strong enough waiting state in the UI.
- P1 test gap: the dark browser shell still has no automated visual regression coverage.

## Test coverage

- Existing coverage:
  - Config normalization and key-conflict validation.
  - Default shortcut template for slideshow and action keys.
  - Session-root-based `move` and `restore` behavior.
  - Session-start fallback from target folders to the parent work root.
  - Review-folder slideshow filtering that hides the current target move action while keeping restore and other actions available.
  - Auto-ending sessions when browsing outside the session subtree.
  - Auto-renaming on target conflicts.
  - Legacy config loading after removing the slideshow back-to-browser binding.
  - Windows PowerShell path quoting for recycle-bin deletion.
- Missing coverage:
  - Browser-side UI flows in `internal/web/static/app.js`.
  - Layout verification that browser mode keeps the tree and image list inside the viewport without a large header shell.
  - Layout verification that slideshow mode stays scrollbar-free at runtime.
  - End-to-end verification of delete-to-recycle-bin behavior.
  - Repeated-action protection for stale slideshow state.
  - Settings capture-state UX and config-edit browser flows.

## Debt and follow-ups

- The frontend currently lives in one large `app.js` file with no automated UI tests.
- There is no documented localization strategy yet.
- `todo.md` still exists as a scratch pad, so future changes should continue moving durable truth into `docs/` instead of expanding that file.
