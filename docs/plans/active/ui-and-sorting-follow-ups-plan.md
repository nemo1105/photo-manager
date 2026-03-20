# UI And Sorting Follow-Ups Plan

Last updated: 2026-03-21
Status: active
Plan class: Standard

## Goal

Track the next round of UX and reliability work after the initial browse/preview/session implementation, with emphasis on making the sorting workflow easier to read and harder to misuse.

## Tasks

- [x] Rework the browser layout so image previews keep their aspect ratio, the top area consumes less vertical space, and navigation controls are separated from work-session actions.
  Current execution focus on 2026-03-20: compact the shared shell, move work-session controls into the right-hand image workbench, and keep navigation inside a dedicated explorer rail.
  Current correction focus on 2026-03-20: replace the slideshow shell with a true immersive viewer that hides the top chrome and reduces controls to a thin bottom dock.
  Current correction focus on 2026-03-20: remove slideshow overflow/white-edge regressions and reset the default shortcut template to `Space`, `Left`, `Right`, `Del`, `Down`, and `Up`.
  Current execution focus on 2026-03-21: remove the slideshow browser-return path, keep `Space` as the single exit, and frame target-folder entry as reviewing already moved photos while restoring to the parent work root.
  Current execution focus on 2026-03-21: center slideshow metadata in the bottom bar and hide the self-target move button while reviewing moved photos.
- [x] Replace the folder card list with a narrower tree-like folder view that still makes hierarchy obvious.
  Current execution focus on 2026-03-20: implement a lazily expanded explorer tree, backed by a tree-only API path so expanding the tree does not accidentally end an active session.
  Current execution focus on 2026-03-20: restyle the browser into a dark, compact resource explorer with a minimal tree, mini breadcrumb, toast notices, and an info-only metadata affordance.
  Current execution focus on 2026-03-20: collapse the browser toolbar to `Sort Here` plus a click-open help panel, move `Settings` into that panel, widen the explorer rail, and tighten tree indentation.
  Current execution focus on 2026-03-21: switch browser help from a sidebar popover to a centered modal, move the root tree row further left, and sort directory lists with natural numeric ordering.
  Current execution focus on 2026-03-21: simplify preview-modal controls by reducing the footer to thin `Prev/Next` buttons and moving close to a compact top-right button.
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
- Manually verify target folders show the review-oriented prompt before session start and the review state inside slideshow.
- Confirm any UI work still keeps action buttons usable without keyboard shortcuts.

## Next update trigger

- Update this plan when any task starts, changes scope, is verified complete, or is replaced by a more detailed execution plan.

