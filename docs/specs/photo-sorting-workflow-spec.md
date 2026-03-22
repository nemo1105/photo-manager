# Photo Sorting Workflow Spec

Last updated: 2026-03-22

## Problem

Users need to start from an arbitrary directory, browse to a folder that contains images to classify, explicitly start sorting from that folder, and then process each image quickly with keyboard shortcuts or large action buttons. The core risk is misclassifying files because target-path resolution, sorting boundaries, or restore behavior become ambiguous.

## Scope

- In scope:
  - Browsing directories inside the launch root.
  - Previewing images without side effects.
  - Explicitly starting and exiting sorting.
  - Executing `move`, `delete`, `restore`, and `command` actions from a single image.
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
- `command.command` is raw command-line text; the product does not support placeholders or inject current-image or current-directory variables.
- Sorting state must not be created implicitly by image preview.
- Browser mode and active work-session/slideshow mode are mutually exclusive. Entering browser mode ends any active session.
- Starting a session from a configured relative move-target folder should treat that folder as a review view for already moved photos, while using its parent as `sessionRoot`.
- Deletion must go to the platform recycle bin / Trash, not permanent removal.
- `command` actions run in a full-screen interactive terminal, through the platform shell, with the initial working directory fixed to `sessionRoot`.
- Slideshow mode is an immersive full-viewport viewer and must not introduce browser-level scrollbars during normal desktop use.
- Browser and tree directory lists should sort naturally by numeric segments instead of pure lexicographic order.
- Browser UI localization supports only `zh-CN` and `en`; any browser locale starting with `zh` maps to `zh-CN`, and other browser locales fall back to `en`.
- Manual language switching is browser-local only, takes precedence over browser-language detection, and must not require a config-file change.
- The help modal should group shortcuts by mode, name arrow keys explicitly as arrow keys, show `Space` as the default slideshow exit, and use a two-column shortcut grid at common desktop widths.
- The directory tree should show right-aligned image counts for the browse root and each visible folder row, counting the folder itself plus at most 3 visible descendant levels and marking deeper visible subtrees as estimated.

## User-Facing Terminology

- Primary task language is `整理 / Sort`.
- Revisiting already moved photos is `复查 / Review`.
- The folder tree and selection state are `文件夹浏览 / Folder browsing`.
- The full-screen photo-processing surface is `整理界面 / Sorting view`.
- `launchRoot` is labeled `浏览范围 / Browse range` in user-facing copy.
- `sessionRoot` is labeled `整理起点 / Sort starting folder` in user-facing copy.
- User-facing UI/help/toast/error text must avoid `会话 / session`, `工作区 / workspace`, `浏览器 / browser`, `幻灯片 / slideshow`, and `捕获 / capture`.

## Acceptance criteria

- [x] Starting the CLI in any folder opens a browser UI rooted at that folder.
- [x] Clicking an image opens preview only and does not start sorting.
- [x] Starting sorting is only possible from the browser view through the fixed button or its configured key.
- [x] When the current folder is a configured relative move target, the browser frames it as reviewing already moved photos and starting there uses the parent folder as the work root.
- [x] While sorting is active, the page shows clear sorting/review state and enables action buttons in the sorting view.
- [x] In a review folder, slideshow hides the move action that points to the current directory while still exposing other actions and `restore`.
- [x] `move` creates missing target folders and auto-renames on conflicts.
- [x] `delete` sends the image to the platform recycle bin / Trash.
- [x] `restore` only works inside configured move-target directories and returns the image to the session root.
- [x] `command` opens a full-screen interactive terminal, starts in `sessionRoot`, and keeps the terminal visible until the user closes it after the process exits.
- [x] Starting `command` from a review folder still uses the parent sort-starting folder as the working directory.
- [x] Moving outside the current sorting range ends sorting automatically and informs the user.
- [x] Config edits in the browser are validated and saved back to `~/.photo-manager/config.yaml`.
- [x] Outside preview and slideshow, configurable browser tree keys move through the visible directory list with Up / Down and expand or collapse the current directory with Right / Left.
- [x] Keyboard-driven directory changes keep the tree expansion state unchanged and debounce browser loading by about 100 ms so rapid scans across image folders do not trigger repeated heavy refreshes.
- [x] The default shortcut template uses `Space` to start work from browser mode and `Space` again to end work from slideshow mode, with `Left` / `Right` for slide navigation, `Del` for delete, `Down` to move into `0`, and `Up` to restore.
- [x] Slideshow mode hides the top shell and keeps the document free of page scrollbars at common desktop sizes.
- [x] Browser and tree directory lists place numeric names in natural order, such as `1`, `2`, then `10`.
- [x] The browser defaults UI copy to `zh-CN` or `en` from the browser locale, and a manual toolbar switch can override that choice without reloading the page.
- [x] The manual language switch lives in the browser toolbar immediately to the left of the help icon and persists across reloads in browser storage.
- [x] Browser chrome, help, settings, preview, slideshow labels, and backend-generated notices / errors stay in the same selected language.
- [x] Refreshing or directly loading browser mode while sorting is active ends sorting instead of reopening browser mode with an active-sorting state.
- [x] The help modal groups browser, preview, slideshow, and action shortcuts separately; it documents arrow keys as `Left/Right/Up/Down Arrow` and shows `Space` as the default slideshow exit without documenting any browser-side session-ending shortcut.
- [x] Settings stays available from the help modal header button, while folder browsing no longer reserves a dedicated settings shortcut.
- [x] Browser parent navigation is exposed only through `collapse_dir`; the product does not keep a second `up_dir` shortcut, UI affordance, or browser response field for the same step.
- [x] The directory tree shows right-aligned image counts for the browse root and each visible folder row, using a 3-level descendant scan cap and a visible estimate marker when deeper visible subfolders are omitted.
- [x] At common desktop widths, the help modal shows shortcuts in two columns with folder browsing plus preview on the first row and sorting view plus sorting actions on the second row.
- [x] Preview and sorting-view footer buttons use the same compact chrome height as the other small controls.
- [x] User-facing copy consistently speaks in terms of sorting/reviewing photos and folder browsing, without exposing internal `session/workspace/browser/slideshow/capture` language.

## Default shortcut template

- Folder browsing:
  - `space` starts sorting from the current folder.
  - `arrowup` and `arrowdown` (`Up Arrow` and `Down Arrow`) move to the previous or next visible directory in the tree.
  - `arrowright` (`Right Arrow`) expands the current directory in the tree.
  - `arrowleft` (`Left Arrow`) collapses the current directory in the tree, or returns to its parent when already collapsed.
  - Keyboard-driven directory switches do not auto-expand the newly selected folder and wait about `100 ms` before reloading the browser pane.
  - Settings opens from the help modal header button instead of a dedicated keyboard shortcut.
  - Loading browser mode ends any active sorting state; folder browsing does not expose a separate exit-sorting key.
- Preview:
  - `escape` closes preview.
  - `arrowleft` and `arrowright` (`Left Arrow` and `Right Arrow`) browse preview images.
- Sorting view:
  - `arrowleft` and `arrowright` (`Left Arrow` and `Right Arrow`) browse images.
  - `space` exits sorting and returns to folder browsing.
- Default actions:
  - `delete` sends the photo to the recycle bin / Trash.
  - `arrowdown` moves the image to relative target `0`.
  - `arrowup` restores the image to `sessionRoot`.
  - The default template does not add a command action; users opt into it by editing settings.

## Open questions

- The browser layout needs a more compact, tree-like folder presentation and clearer separation between navigation controls and work-session controls.
- The same-image double-action path still needs a guarded UX and test coverage so stale UI state cannot trigger a second invalid request.
