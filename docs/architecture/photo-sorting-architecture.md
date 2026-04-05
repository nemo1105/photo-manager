# Photo Sorting Architecture

Last updated: 2026-04-05

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
- Browser-mode single-image actions run without a work session; they stay constrained to the current browser directory and currently support only recycle-bin delete.
- Browser-mode single-folder actions also run without a work session. They operate on the currently selected tree row, not on the current image list, and the current implementation supports `move` plus recycle-bin delete.
- Browser mode and active slideshow/work-session state are mutually exclusive. Any successful `GET /api/browser` clears the current session before returning browser data.
- A work session owns one `sessionRoot`. Relative action targets are resolved from `sessionRoot` for the entire session.
- Browser-mode relative folder-move targets resolve from the selected folder's parent directory, so moving `work/a` into relative target `0` produces `work/0/a`.
- `command` actions also anchor to `sessionRoot`; they do not use the current image directory as their working directory.
- Starting from a relative move-target folder reuses that folder as the slideshow directory but sets `sessionRoot` to its parent, so review folders still restore back to the work root.
- Leaving `sessionRoot` or any of its descendants during slideshow loading or action requests automatically ends the session.
- `restore` is only valid when the current directory matches one of the configured `move` targets resolved against `sessionRoot`, and the slideshow action list omits it everywhere else instead of rendering a disabled button.
- When slideshow is opened inside a move-target directory, the action list omits any `move` binding whose destination is that same directory.
- `command.command` is raw shell text only. The product does not expand placeholders or inject current-image or current-directory variables.
- `alias` is the user-facing label for `move` and `command` actions. Sorting buttons and help action labels prefer it; command-terminal titles also prefer it for `command` actions. Legacy configs without it fall back to the old target-based or generic command labels until the user saves a fixed config.
- Only one interactive command-terminal session may exist at a time, and while it is open the sorting UI must not also react to keyboard shortcuts.
- Command-terminal transport ordering must preserve trailing PTY output before exit state: WebSocket `output` frames drain first, and the `exit` frame is emitted only after output streaming finishes.
- Directory listing is shallow: only direct child folders and direct child images of the current directory are returned.
- Each visible directory row carries a bounded subtree image count computed from that folder's direct images plus at most 3 levels of visible descendants. If visible subfolders continue deeper, the count is marked as estimated instead of walking unboundedly.
- Browser and tree payloads may also carry localized directory decorations for the current node and each visible child directory. The current implementation uses an internal decorator registry and does not expose plugin editing in config or settings.
- Directory decorations are local to the directory being evaluated. The built-in `done-marker` only checks for `done.txt` inside that exact folder; it does not bubble state up to parent folders.
- Directory-decoration failures are isolated: a failed decorator is logged and skipped without failing the whole browser or tree request.
- Returned directory lists use natural numeric ordering, so names like `1`, `2`, and `10` sort in human order.
- Folder browsing stays interactive while `GET /api/browser` is in flight: the newest requested directory becomes the selected target immediately, the gallery clears to a loading state for that target once the request starts, and stale responses or superseded request failures must not roll the UI back.
- Hidden entries are ignored. Supported image formats are `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, and `.bmp`.
- Browse-gallery card sizing is client-side only: the API still returns `name`, `path`, and `url`, while the browser measures decoded image dimensions after load and packs cards into a masonry grid without cropping the image.
- Name conflicts for `move` and `restore` are resolved by creating `name (N).ext` variants.
- Browser-mode folder moves use the same conflict strategy for directory names, and browser-mode folder deletes require explicit confirmation in the UI before the request is sent.
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
  - `keys.browser` exposes session start plus tree up/down and tree expand/collapse keys.
  - `keys.slideshow` currently exposes `next`, `prev`, and `end_session`; slideshow no longer has a separate browser-return binding.
  - `actions[]` defines `move`, `delete`, `restore`, and `command` buttons/shortcuts.
  - `browser_actions[]` reuses the same action object shape as `actions[]`, but browser-mode execution currently accepts only `move` and `delete`.
  - Directory decorations are not user-configurable in v1. The app registers them internally at startup.
  - `move.target` accepts relative or absolute paths.
  - `command.command` stores the raw command-line text to run via the platform shell.
  - `alias` stores the user-facing label for `move` and `command` actions. It is required on save for those action types and rejected on `delete` / `restore`.
  - The default template maps `space` to browser session start and slideshow session end, `arrowup` / `arrowdown` / `arrowright` / `arrowleft` to browser-tree navigation, `arrowleft` and `arrowright` to slide navigation, `delete` to delete, `arrowdown` to move into `0`, and `arrowup` to restore.
- HTTP API:
- `GET /api/browser`: current directory listing, localized breadcrumbs, config, whether starting here should be framed as reviewing moved photos, current-directory bounded image-count metadata, localized current-directory decorations, and per-directory bounded image counts plus localized decorations for each visible child folder. Calling it also clears any active session so browser mode never renders with an active session. The payload intentionally omits legacy parent-navigation fields such as `parentPath` and `canGoUp`.
- `POST /api/browser/action`: executes browser-mode single-image actions for the current directory without requiring a session. The current implementation supports `delete` only.
- `POST /api/browser/folder-action`: executes browser-mode single-folder actions for the selected tree row without requiring a session. Requests use `path` plus `actionKey`, and the response returns a localized `notice` plus `nextPath` so the browser can jump back to the original parent folder after `move` or `delete`.
- `GET /api/tree`: current directory path, request-localized current-directory decorations, current-directory bounded image-count metadata, and visible child directories with per-directory bounded image counts plus localized decorations.
  - `POST /api/session/start`: creates or reuses a session for the current directory.
  - `POST /api/session/end`: clears the active session.
- `GET /api/slideshow`: current directory image list plus localized action labels and action availability.
  - `POST /api/action`: executes `move`, `delete`, or `restore` for one image using the configured key.
  - `POST /api/command/start`: validates a `command` action against the current slideshow state, reserves one interactive terminal session, and returns both the raw command text plus the alias-based terminal title.
  - `GET /api/command/ws?id=...`: upgrades to WebSocket, attaches the reserved terminal session, streams output, accepts input/resize/terminate messages, and emits exit state only after the output stream has drained.
  - `GET /api/config` and `POST /api/config`: load and save validated config.
  - `GET /image`: streams the original image file.
  - `X-Photo-Manager-Locale` is an optional request header. When present with `en` or `zh-CN`, it overrides `Accept-Language`; otherwise the handler falls back to `Accept-Language`, then `en`.

## Dependencies

- Go standard library: `net/http`, `embed`, `os`, `path/filepath`, `os/signal`, `os/exec`.
- `gopkg.in/yaml.v3` for config parsing and persistence.
- Windows PowerShell or macOS `osascript` for recycle-bin / Trash integration.
- `github.com/coder/websocket` for the terminal WebSocket.
- `github.com/UserExistsError/conpty` on Windows and `github.com/creack/pty` on Unix-like systems for interactive terminal I/O.
- Browser-side JavaScript in `internal/web/static/app.js` for state transitions and key handling.
- Vendored `xterm.js` browser assets plus the fit addon for the in-page terminal surface.
- Internal locale helpers in `internal/localize/` centralize request-locale parsing and backend message text.

## Decisions

- The product currently separates browse, preview, and slideshow modes instead of mixing them.
- Session creation is explicit to protect the sorting logic from accidental clicks while browsing.
- Refreshing or directly loading browser mode during an active session intentionally ends that session instead of attempting to reconstruct slideshow state in browser mode.
- Browser-mode tree navigation follows the currently visible tree rows, so collapsing an already collapsed directory steps selection back to its parent instead of hiding the active location.
- Keyboard-driven browser navigation keeps a transient tree focus separate from the last loaded browser directory, preserves the existing expansion state, and debounces browser reloads by `100 ms` to reduce image-list churn during rapid scans.
- Mouse and keyboard browse loads share a latest-request-wins frontend state machine. The tree selection follows the newest target, the gallery shows a loading panel for that target when the request is active, and stale responses or stale request errors are ignored instead of restoring older browser content.
- Parent navigation intentionally lives inside `collapse_dir`; the product no longer exposes a separate browser `up_dir` shortcut because it duplicated the same navigation outcome.
- The browser payload also drops the old `parentPath` / `canGoUp` fields so the transport contract does not preserve an obsolete parent-navigation model.
- Directory counts now travel with the existing browser and tree payloads, so the help modal no longer needs its own subtree-stats request path.
- Directory decorations also travel with the existing browser and tree payloads, so the tree UI does not need a separate status lookup route.
- Relative target directories intentionally use `sessionRoot` so any configured review folder, including the default `0`, still restores back to the original work root.
- `command` actions intentionally follow that same `sessionRoot` rule, even when the slideshow is currently inside a review folder.
- Command-terminal UX is modal and fullscreen. The process keeps the terminal surface until exit, then the user closes that surface manually to return to sorting.
- The browser bundle remains dependency-light by vendoring browser-ready `xterm.js` assets into the embedded static tree instead of introducing a separate frontend build system.
- The browse gallery keeps the backend payload unchanged and derives portrait/landscape layout from browser-decoded `naturalWidth` / `naturalHeight`, so supported image formats do not need matching Go-side metadata decoders.
- The browse-gallery overflow trigger is a frontend-only affordance layered onto each card; it does not change gallery payload shape and uses a dedicated browser-action endpoint instead of the slideshow action-key path.
- The tree row overflow trigger is also a frontend-only affordance. It appears only while the selected row is hovered, shifts the count badge left for that hover state, and routes through a dedicated browser-folder-action endpoint instead of the slideshow action-key path.
- Review-folder entry is explained in the UI as checking already moved photos, rather than exposing the session-root fallback directly.
- The default action template now favors a single hot folder, `0`, so a fresh install exposes one high-risk move target instead of several competing move destinations.
- Browser-mode action configuration intentionally mirrors the sorting action object shape so later browser `command` support can extend the existing UI and transport model instead of introducing a third action schema.
- `command.command` intentionally stays as plain shell text with no placeholder DSL or auto-injected current-image/current-directory variables.
- Missing `alias` on `move` or `command` is treated as a legacy-load compatibility case only: config load tolerates it, but config save rejects it until the user fills the alias.
- The current implementation prefers a small dependency set over a larger frontend framework.
- `keys.browser.end_session` is intentionally removed from the product contract; old YAML that still contains it is ignored on load and dropped on the next save.
- `keys.browser.up_dir` is intentionally removed from the product contract; old YAML that still contains it is ignored on load and dropped on the next save.
- `keys.browser.open_settings` is intentionally removed from the product contract so folder-browsing keys stay focused on navigation plus sorting start; settings now opens only from the help modal header button, and old YAML that still contains `browser.open_settings` is ignored on load and dropped on the next save.
- Localization stays dependency-light: frontend strings live in the static app bundle, backend request parsing and user-visible server messages live in `internal/localize/`, and the help modal plus directory-count tooltip reuse the same locale.
- Directory decorations intentionally start as an internal, built-in registry rather than YAML-defined rules or external scripts, so the single-binary app keeps predictable performance and trust boundaries.
- User-facing language is task-first rather than implementation-first: the UI talks about sorting, reviewing, folders, preview, and sorting view, while internal API and code symbols may still use `session`.
- The manual language switch lives in the browser toolbar immediately to the left of the help icon, while slideshow and preview reuse the current locale instead of introducing separate locale controls.

