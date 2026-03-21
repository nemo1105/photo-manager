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
  Current execution focus on 2026-03-21: route review hints and action feedback through animated bottom-right toast notifications, and drop low-value session start/end notices.
- [x] Replace the folder card list with a narrower tree-like folder view that still makes hierarchy obvious.
  Current execution focus on 2026-03-20: implement a lazily expanded explorer tree, backed by a tree-only API path so expanding the tree does not accidentally end an active session.
  Current execution focus on 2026-03-20: restyle the browser into a dark, compact resource explorer with a minimal tree, mini breadcrumb, toast notices, and an info-only metadata affordance.
  Current execution focus on 2026-03-20: collapse the browser toolbar to `Sort Here` plus a click-open help panel, move `Settings` into that panel, widen the explorer rail, and tighten tree indentation.
  Current execution focus on 2026-03-21: switch browser help from a sidebar popover to a centered modal, move the root tree row further left, and sort directory lists with natural numeric ordering.
  Current execution focus on 2026-03-21: simplify preview-modal controls by reducing the footer to thin `Prev/Next` buttons and moving close to a compact top-right button.
  Current execution focus on 2026-03-21: make repeated clicks on the current tree directory toggle that branch open and closed, instead of relying only on the chevron affordance.
  Current execution focus on 2026-03-21: let browser-mode arrow keys drive the visible tree with configurable up/down selection plus right-expand and left-collapse behavior.
  Current correction focus on 2026-03-21: keep keyboard tree movement from auto-expanding directories, and debounce browser loads by 100 ms so fast directory scans do not stutter on image-heavy folders.
  Current execution focus on 2026-03-21: regroup help-modal shortcuts by mode, remove obsolete browser-side session-ending copy, keep browser mode and active slideshow sessions mutually exclusive, and replace the help footer session row with tighter direct plus recursive image counts from a dedicated stats endpoint.
  Current execution focus on 2026-03-21: remove the redundant browser `up_dir` path so parent navigation lives only in collapse / parent behavior instead of a second overlapping shortcut.
  Current execution focus on 2026-03-21: drop the stale browser `parentPath` / `canGoUp` response fields and the dead frontend `up-dir` branch so the API contract matches the remaining navigation model.
  Current execution focus on 2026-03-21: remove the browser-side settings shortcut, keep settings entry explicit through the help header button, switch help shortcuts to a stable two-column layout, and shrink preview/sorting-view buttons to the same compact height as the surrounding chrome.
  Current correction focus on 2026-03-21: keep every help-modal shortcut row to a single line so longer preview labels do not grow taller than neighboring shortcut rows.
  Current correction focus on 2026-03-21: keep the help modal content scrolled to and laid out from the top, instead of visually anchoring the shortcut grid from the bottom edge.
  Current correction focus on 2026-03-21: keep shorter help shortcut cards like Preview and Sorting View pinned to the top of their row instead of stretching and leaving empty space above their entries.
  Current correction focus on 2026-03-21: stack help shortcuts by column so Folder Browsing sits directly above Preview, Sorting View sits directly above Sorting Actions, and the paired cards touch vertically without an extra gap.
  Current correction focus on 2026-03-21: keep the browser start-work button brighter on hover, and hide the bottom-right toast shell entirely until a notice is active so idle chrome does not leave a stray border.
  Current correction focus on 2026-03-21: keep the browse-root row pinned open, remove its chevron affordance, and render it with the same folder-row treatment as normal directories.
  Current correction focus on 2026-03-21: pull the browse-root row slightly left so its folder chip aligns with the left edge of child-folder chevrons.
  Current execution focus on 2026-03-21: restyle the settings modal to match the same modal-card, section-card, and compact utility-button language already used by help and the main browser shell.
- [x] Add zh-CN / en localization with default language chosen from the browser locale.
  Current execution focus on 2026-03-21: detect locale from browser language on first load, let the browser toolbar switch between `zh-CN` and `en`, persist manual choice in browser storage, and localize backend notices / errors through the same request locale.
  Current execution focus on 2026-03-21: replace implementation-heavy user copy with task language centered on `整理 / Sort`, `复查 / Review`, `文件夹浏览 / Folder browsing`, and `整理界面 / Sorting view`.
- [ ] Split the browser UI entrypoint into smaller modules without changing any workflow behavior.
  Current execution focus on 2026-03-21: move pure frontend helpers and view-fragment builders out of `internal/web/static/app.js`, keep behavior in the entrypoint unchanged, and serve the new module files through the embedded static handler.
- [ ] Prevent repeated operations on the same stale image state from surfacing as user-visible errors.
- [ ] Make the settings key-capture mode visually obvious while waiting for the next key press.

## Risks

- Layout work touches the main browser and slideshow shell, so regressions can easily break the session indicator or button discoverability.
- Fixing repeated actions may require both frontend debouncing and backend state validation.
- Localization will increase UI text surface area and can make button layouts unstable if not tested on smaller screens.
- Reworking terminology touches nearly every visible label and notice, so inconsistent fallback strings can easily leak old `session/workspace/slideshow` wording back into the product.
- The dedicated help stats lookup walks the current subtree recursively, so large folders still need manual runtime verification for latency inside the modal.
- Removing `browser.end_session` changes both config shape and browser/session semantics, so refresh and old-config save paths need explicit regression coverage.
- Removing `browser.up_dir` changes the config shape again, so old YAML cleanup and browser shortcut/help coverage need to stay aligned.
- Removing `browser.open_settings` changes the config shape again, so old YAML cleanup and help/settings-entry coverage need to stay aligned.

## Decisions

- `todo.md` remains a scratch pad, but the canonical status for these follow-ups now lives in this plan.
- This is a `Plan class: Standard` document because the work is active but still routine and bounded.
- The P0 layout refresh keeps the existing sorting semantics unchanged; the redesign is a shell, explorer, and interaction refactor rather than a workflow rewrite.
- The visual direction for the P0 refresh is a compact explorer/workbench shell with high-contrast neutral surfaces, a single blue accent, and persistent but non-intrusive session highlighting.
- Localization now defaults to the browser locale, supports only `zh-CN` and `en`, persists manual override in browser storage, and exposes the switch in the browser toolbar immediately to the left of the help icon.
- User-facing language now follows a task-first glossary: `整理 / Sort`, `复查 / Review`, `文件夹浏览 / Folder browsing`, and `整理界面 / Sorting view`; internal implementation terms like `session` remain code-level only.
- Browser mode and active work sessions are now mutually exclusive. Loading browser mode, including refresh, silently ends any active session instead of preserving a browser-side active-session state.
- `keys.browser.end_session` is removed from the product contract. `Space` starts work from browser mode, `Space` ends work from slideshow mode, and old YAML with `browser.end_session` is ignored and dropped on the next save.
- Help-modal shortcut guidance is now grouped into browser, preview, slideshow, and action sections; it explicitly names arrow keys, documents only browser start plus slideshow end semantics, and uses a dedicated stats request so recursive image totals do not slow normal browser navigation.
- `keys.browser.up_dir` is removed from the product contract because `collapse_dir` already covers both collapsing the current node and stepping to the parent when appropriate. Old YAML with `browser.up_dir` is ignored and dropped on the next save.
- `keys.browser.open_settings` is removed from the product contract so folder-browsing keys stay focused on navigation plus sorting start. Settings now opens only from the help modal header button, and old YAML with `browser.open_settings` is ignored and dropped on the next save.
- The browser payload no longer carries legacy `parentPath` / `canGoUp` fields, and the frontend no longer keeps an unused `up-dir` toolbar action branch.

## Verification

- Run `go test ./...` and `go build ./...`.
- Verify `zh-CN` and `en` both localize browser chrome, help, settings, preview, slideshow copy, and backend toast / error responses.
- Verify user-facing UI/help/toast/error copy no longer exposes `会话 / session`, `工作区 / workspace`, `浏览器 / browser`, `幻灯片 / slideshow`, or `捕获 / capture` as product concepts.
- Verify the help modal header places `Settings` immediately left of `Close`, removes session status, and shows direct folder count, direct image count, and recursive image count for the current subtree.
- Verify the help modal shortcut cards use two columns at common desktop widths, with folder browsing plus preview on the first row and sorting view plus sorting actions on the second row.
- Verify refreshing or directly reopening browser mode during an active slideshow ends the session silently and does not surface browser-side active-session controls.
- Verify browser help and settings no longer show a separate "go up a folder" shortcut, and left-arrow collapse / parent remains the only parent-navigation path.
- Verify settings no longer exposes or reacts to a dedicated browser-side shortcut, and old `browser.open_settings` config entries disappear on the next save.
- Verify `/api/browser` no longer returns legacy `parentPath` / `canGoUp` fields.
- Manually verify preview and sorting-view footer buttons match the compact height of the surrounding browser chrome.
- Manually verify browse, preview, start-session, move, delete, restore, and auto-end-session behavior in the browser.
- Manually verify target folders trigger the review toast before session start and the review state inside slideshow.
- Confirm any UI work still keeps action buttons usable without keyboard shortcuts.

## Next update trigger

- Update this plan when any task starts, changes scope, is verified complete, or is replaced by a more detailed execution plan.

