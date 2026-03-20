# Photo Sorting Workflow Spec

Last updated: 2026-03-20

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
- Deletion must go to the platform recycle bin / Trash, not permanent removal.
- Slideshow mode is an immersive full-viewport viewer and must not introduce browser-level scrollbars during normal desktop use.

## Acceptance criteria

- [x] Starting the CLI in any folder opens a browser UI rooted at that folder.
- [x] Clicking an image opens preview only and does not start a work session.
- [x] Starting a work session is only possible from the browser view through the fixed button or its configured key.
- [x] While a session is active, the page shows a persistent session indicator and enables action buttons in the slideshow.
- [x] `move` creates missing target folders and auto-renames on conflicts.
- [x] `delete` sends the image to the platform recycle bin / Trash.
- [x] `restore` only works inside configured move-target directories and returns the image to the session root.
- [x] Moving outside the session root subtree ends the session automatically and informs the user.
- [x] Config edits in the browser are validated and saved back to `~/.photo-manager/config.yaml`.
- [x] The default shortcut template uses `Space` to enter or end a session, `Left` and `Right` to change slides, `Del` to delete, `Down` to move into `0`, and `Up` to restore.
- [x] Slideshow mode hides the top shell and keeps the document free of page scrollbars at common desktop sizes.

## Default shortcut template

- Browser:
  - `space` starts a work session from the current folder.
  - `q` ends the active session.
  - `backspace` goes up one folder.
  - `s` opens settings.
- Preview:
  - `escape` closes preview.
  - `arrowleft` and `arrowright` browse preview images.
- Slideshow:
  - `arrowleft` and `arrowright` browse images.
  - `escape` returns to browser mode without ending the session.
  - `space` ends the active session and exits slideshow.
- Default actions:
  - `delete` deletes to the recycle bin / Trash.
  - `arrowdown` moves the image to relative target `0`.
  - `arrowup` restores the image to `sessionRoot`.

## Open questions

- The browser layout needs a more compact, tree-like folder presentation and clearer separation between navigation controls and work-session controls.
- The UI currently has no language switch or browser-language-driven localization layer.
- The same-image double-action path still needs a guarded UX and test coverage so stale UI state cannot trigger a second invalid request.
