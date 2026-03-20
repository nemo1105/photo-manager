# Photo Sorting Workflow Spec

Last updated: 2026-03-21

## Problem

Users need to start from an arbitrary directory, browse to a folder that contains images to classify, explicitly mark that folder as the current work root, and then process each image quickly with keyboard shortcuts or large action buttons. The core risk is misclassifying files because target-path resolution, session boundaries, or restore behavior become ambiguous.

## Scope

- In scope:
  - Browsing directories inside the launch root.
  - Previewing images without side effects.
  - Explicitly starting and ending a work session.
  - Executing `move`, `delete`, and `restore` actions on a single image.
  - Editing key bindings and actions in the web UI and saving them to `~/.photo-manager/config.yaml`.
- Out of scope:
  - Recursive slideshow across subdirectories.
  - Multi-file batch actions.
  - Undo history beyond `restore` from configured target directories.
  - Linux Trash support.

## Constraints

- Launch-root containment must be enforced on every path coming from the browser.
- All configured keys are single keys; modifier combinations are not part of the current contract.
- Relative `move.target` values are resolved from the active session root only.
- Work-session state must not be created implicitly by image preview.
- Starting a session from a configured relative move-target folder should treat that folder as a review view for already moved photos, while using its parent as `sessionRoot`.
- Deletion must go to the platform recycle bin / Trash, not permanent removal.
- Slideshow mode is an immersive full-viewport viewer and must not introduce browser-level scrollbars during normal desktop use.
- Browser and tree directory lists should sort naturally by numeric segments instead of pure lexicographic order.

## Acceptance criteria

- [x] Starting the CLI in any folder opens a browser UI rooted at that folder.
- [x] Clicking an image opens preview only and does not start a work session.
- [x] Starting a work session is only possible from the browser view through the fixed button or its configured key.
- [x] When the current folder is a configured relative move target, the browser frames it as reviewing already moved photos and starting there uses the parent folder as the work root.
- [x] While a session is active, the page shows a persistent session indicator and enables action buttons in the slideshow.
- [x] In a review folder, slideshow hides the move action that points to the current directory while still exposing other actions and `restore`.
- [x] `move` creates missing target folders and auto-renames on conflicts.
- [x] `delete` sends the image to the platform recycle bin / Trash.
- [x] `restore` only works inside configured move-target directories and returns the image to the session root.
- [x] Moving outside the session root subtree ends the session automatically and informs the user.
- [x] Config edits in the browser are validated and saved back to `~/.photo-manager/config.yaml`.
- [x] Outside preview and slideshow, configurable browser tree keys move through the visible directory list with Up / Down and expand or collapse the current directory with Right / Left.
- [x] Keyboard-driven directory changes keep the tree expansion state unchanged and debounce browser loading by about 100 ms so rapid scans across image folders do not trigger repeated heavy refreshes.
- [x] The default shortcut template uses `Space` to enter or end a session, `Left` and `Right` to change slides, `Del` to delete, `Down` to move into `0`, and `Up` to restore.
- [x] Slideshow mode hides the top shell and keeps the document free of page scrollbars at common desktop sizes.
- [x] Browser and tree directory lists place numeric names in natural order, such as `1`, `2`, then `10`.

## Default shortcut template

- Browser:
  - `space` starts a work session from the current folder.
  - `q` ends the active session.
  - `arrowup` and `arrowdown` move to the previous or next visible directory in the tree.
  - `arrowright` expands the current directory in the tree.
  - `arrowleft` collapses the current directory in the tree, or returns to its parent when already collapsed.
  - Keyboard-driven directory switches do not auto-expand the newly selected folder and wait about `100 ms` before reloading the browser pane.
  - `backspace` goes up one folder.
  - `s` opens settings.
- Preview:
  - `escape` closes preview.
  - `arrowleft` and `arrowright` browse preview images.
- Slideshow:
  - `arrowleft` and `arrowright` browse images.
  - `space` ends the active session and exits slideshow.
- Default actions:
  - `delete` deletes to the recycle bin / Trash.
  - `arrowdown` moves the image to relative target `0`.
  - `arrowup` restores the image to `sessionRoot`.

## Open questions

- The browser layout needs a more compact, tree-like folder presentation and clearer separation between navigation controls and work-session controls.
- The UI currently has no language switch or browser-language-driven localization layer.
- The same-image double-action path still needs a guarded UX and test coverage so stale UI state cannot trigger a second invalid request.
