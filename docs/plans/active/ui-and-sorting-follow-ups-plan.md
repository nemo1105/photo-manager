# UI And Sorting Follow-Ups Plan

Last updated: 2026-03-20
Status: active
Plan class: Standard

## Goal

Track the next round of UX and reliability work after the initial browse/preview/session implementation, with emphasis on making the sorting workflow easier to read and harder to misuse.

## Tasks

- [ ] Rework the browser layout so image previews keep their aspect ratio, the top area consumes less vertical space, and navigation controls are separated from work-session actions.
  Current execution focus on 2026-03-20: compact the shared shell, move work-session controls into the right-hand image workbench, and keep navigation inside a dedicated explorer rail.
  Current correction focus on 2026-03-20: replace the slideshow shell with a true immersive viewer that hides the top chrome and reduces controls to a thin bottom dock.
  Current correction focus on 2026-03-20: remove slideshow overflow/white-edge regressions and reset the default shortcut template to `Space`, `Left`, `Right`, `Del`, `Down`, and `Up`.
- [ ] Replace the folder card list with a narrower tree-like folder view that still makes hierarchy obvious.
  Current execution focus on 2026-03-20: implement a lazily expanded explorer tree, backed by a tree-only API path so expanding the tree does not accidentally end an active session.
- [ ] Add zh-CN / en localization with default language chosen from the browser locale.
- [ ] Prevent repeated operations on the same stale image state from surfacing as user-visible errors.
- [ ] Make the settings key-capture mode visually obvious while waiting for the next key press.

## Risks

- Layout work touches the main browser and slideshow shell, so regressions can easily break the session indicator or button discoverability.
- Fixing repeated actions may require both frontend debouncing and backend state validation.
- Localization will increase UI text surface area and can make button layouts unstable if not tested on smaller screens.

## Decisions

- `todo.md` remains a scratch pad, but the canonical status for these follow-ups now lives in this plan.
- This is a `Plan class: Standard` document because the work is active but still routine and bounded.
- The P0 layout refresh keeps the existing sorting semantics unchanged; the redesign is a shell, explorer, and interaction refactor rather than a workflow rewrite.
- The visual direction for the P0 refresh is a compact explorer/workbench shell with high-contrast neutral surfaces, a single blue accent, and persistent but non-intrusive session highlighting.

## Verification

- Run `go test ./...` and `go build ./...`.
- Manually verify browse, preview, start-session, move, delete, restore, and auto-end-session behavior in the browser.
- Confirm any UI work still keeps action buttons usable without keyboard shortcuts.

## Next update trigger

- Update this plan when any task starts, changes scope, is verified complete, or is replaced by a more detailed execution plan.

