# Photo Sorting Architecture

Last updated: 2026-03-21

## Purpose

This application is a single-binary Go tool that starts from an explicit launch root, serves an embedded web UI, and lets the user browse folders, start an explicit work session, and classify images with keyboard shortcuts or buttons.

## User Copy Policy

- Internal implementation may keep `session`, `browser`, and `slideshow` terminology.
- User-facing UI/help/toast/error copy must use sorting-task language instead:
  - `整理 / Sort`
  - `复查 / Review`
  - `文件夹浏览 / Folder browsing`
  - `整理界面 / Sorting view`
- User-facing copy must avoid exposing `session`, `workspace`, `browser`, `slideshow`, and `capture` as product concepts.

## Invariants

- `launchRoot` is fixed at process start and comes from the CLI `-dir` argument when provided, otherwise from the current working directory used to launch the CLI.
- All browser and image paths are expressed as launch-root-relative paths and are sanitized so they cannot escape `launchRoot`.
- Browsing folders and previewing images never starts a work session. Only `POST /api/session/start` does.
- Browser mode and active slideshow/work-session state are mutually exclusive. Any successful `GET /api/browser` clears the current session before returning browser data.
- A work session owns one `sessionRoot`. Relative action targets are resolved from `sessionRoot` for the entire session.
- Starting from a relative move-target folder reuses that folder as the slideshow directory but sets `sessionRoot` to its parent, so review folders still restore back to the work root.
- Leaving `sessionRoot` or any of its descendants during slideshow loading or action requests automatically ends the session.
- `restore` is only valid when the current directory matches one of the configured `move` targets resolved against `sessionRoot`.
- When slideshow is opened inside a move-target directory, the action list omits any `move` binding whose destination is that same directory.
- Directory listing is shallow: only direct child folders and direct child images of the current directory are returned.
- `GET /api/browser/stats` is side-effect free: it must not start or end sessions, and it reports direct child counts plus recursive visible-image totals for the current subtree.
- Returned directory lists use natural numeric ordering, so names like `1`, `2`, and `10` sort in human order.
- Hidden entries are ignored. Supported image formats are `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, and `.bmp`.
- Name conflicts for `move` and `restore` are resolved by creating `name (N).ext` variants.
- Slideshow mode is rendered as an immersive single-viewer surface. It hides the shared shell and is expected to fit inside the viewport without page scrollbars.
- Web localization supports only `en` and `zh-CN`; browser locales beginning with `zh` map to `zh-CN`, and everything else falls back to `en`.
- The browser can override locale selection locally, and that manual choice takes precedence over browser-language detection for later requests from the same browser profile.

## Interfaces

- CLI startup:
  - `launchRoot` comes from `photo-manager -dir <path>` when provided, otherwise from the shell working directory.
  - Config is loaded from `~/.photo-manager/config.yaml`, or created with defaults if missing.
  - A local HTTP server is bound to `127.0.0.1:random-port` and the default browser is opened.
- Config shape:
  - `keys.browser`, `keys.preview`, and `keys.slideshow` define single-key bindings per mode.
  - `keys.browser` exposes session start, tree up/down movement, tree expand/collapse, and settings keys.
  - `keys.slideshow` currently exposes `next`, `prev`, and `end_session`; slideshow no longer has a separate browser-return binding.
  - `actions[]` defines `move`, `delete`, and `restore` buttons/shortcuts.
  - `move.target` accepts relative or absolute paths.
  - The default template maps `space` to browser session start and slideshow session end, `arrowup` / `arrowdown` / `arrowright` / `arrowleft` to browser-tree navigation, `arrowleft` and `arrowright` to slide navigation, `delete` to delete, `arrowdown` to move into `0`, and `arrowup` to restore.
- HTTP API:
  - `GET /api/browser`: current directory listing, localized breadcrumbs, config, and whether starting here should be framed as reviewing moved photos. Calling it also clears any active session so browser mode never renders with an active session. The payload intentionally omits legacy parent-navigation fields such as `parentPath` and `canGoUp`.
  - `GET /api/browser/stats`: current directory path plus direct visible folder count, direct visible image count, and recursive visible image count for help-modal summary stats.
  - `POST /api/session/start`: creates or reuses a session for the current directory.
  - `POST /api/session/end`: clears the active session.
- `GET /api/slideshow`: current directory image list plus localized action labels and action availability.
  - `POST /api/action`: executes one image action using the configured key.
  - `GET /api/config` and `POST /api/config`: load and save validated config.
  - `GET /image`: streams the original image file.
  - `X-Photo-Manager-Locale` is an optional request header. When present with `en` or `zh-CN`, it overrides `Accept-Language`; otherwise the handler falls back to `Accept-Language`, then `en`.

## Dependencies

- Go standard library: `net/http`, `embed`, `os`, `path/filepath`, `os/signal`, `os/exec`.
- `gopkg.in/yaml.v3` for config parsing and persistence.
- Windows PowerShell or macOS `osascript` for recycle-bin / Trash integration.
- Browser-side JavaScript in `internal/web/static/app.js` for state transitions and key handling.
- Internal locale helpers in `internal/localize/` centralize request-locale parsing and backend message text.

## Decisions

- The product currently separates browse, preview, and slideshow modes instead of mixing them.
- Session creation is explicit to protect the sorting logic from accidental clicks while browsing.
- Refreshing or directly loading browser mode during an active session intentionally ends that session instead of attempting to reconstruct slideshow state in browser mode.
- Browser-mode tree navigation follows the currently visible tree rows, so collapsing an already collapsed directory steps selection back to its parent instead of hiding the active location.
- Keyboard-driven browser navigation keeps a transient tree focus separate from the last loaded browser directory, preserves the existing expansion state, and debounces browser reloads by `100 ms` to reduce image-list churn during rapid scans.
- Parent navigation intentionally lives inside `collapse_dir`; the product no longer exposes a separate browser `up_dir` shortcut because it duplicated the same navigation outcome.
- The browser payload also drops the old `parentPath` / `canGoUp` fields so the transport contract does not preserve an obsolete parent-navigation model.
- Recursive help stats are fetched lazily through `/api/browser/stats` when the help modal opens, so normal browser navigation stays shallow and avoids subtree walks on every directory change.
- Relative target directories intentionally use `sessionRoot` so any configured review folder, including the default `0`, still restores back to the original work root.
- Review-folder entry is explained in the UI as checking already moved photos, rather than exposing the session-root fallback directly.
- The default action template now favors a single hot folder, `0`, so a fresh install exposes one high-risk move target instead of several competing move destinations.
- The current implementation prefers a small dependency set over a larger frontend framework.
- `keys.browser.end_session` is intentionally removed from the product contract; old YAML that still contains it is ignored on load and dropped on the next save.
- `keys.browser.up_dir` is intentionally removed from the product contract; old YAML that still contains it is ignored on load and dropped on the next save.
- Localization stays dependency-light: frontend strings live in the static app bundle, backend request parsing and user-visible server messages live in `internal/localize/`, the help modal reuses that locale for stats and shortcut copy, and the config file schema remains unchanged.
- User-facing language is task-first rather than implementation-first: the UI talks about sorting, reviewing, folders, preview, and sorting view, while internal API and code symbols may still use `session`.
- The manual language switch lives in the browser toolbar immediately to the left of the help icon, while slideshow and preview reuse the current locale instead of introducing separate locale controls.

