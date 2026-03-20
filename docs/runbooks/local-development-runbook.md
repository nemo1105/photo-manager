# Local Development Runbook

Last updated: 2026-03-21

## Preconditions

- Go 1.25.x is installed.
- Run the CLI from the directory you want to use as the launch root, or pass `-dir <path>` explicitly.
- Windows or macOS is required for recycle-bin / Trash behavior.
- If you want to exercise config persistence, ensure the current user can write `~/.photo-manager/config.yaml`.

## Steps

1. Open a terminal in any convenient directory, and choose a test folder that contains sample images and subfolders.
2. Run `go test ./...` to validate backend behavior before manual testing.
3. Run `go run .` from the test folder, or run `go run . -dir <path-to-test-folder>` from elsewhere.
4. In the browser UI, browse to a folder with supported images.
5. Start a work session using the button or its configured browser key.
6. Browse into a configured target folder such as `0`, confirm the browser switches to a review-oriented prompt, start there, and verify `restore` returns files to the parent work folder.
7. Exercise `move`, `delete`, and `restore` using both the buttons and the configured keys.
8. Open Settings, change a key or action, save, and confirm the new binding works immediately.
9. Navigate outside the active session root and confirm the session ends automatically with a notice.

## Rollback

- Stop the server with `Ctrl+C`.
- If a test changed your personal config, restore `~/.photo-manager/config.yaml` from version control or a backup copy.
- Move files back out of test target folders or retrieve deleted files from the recycle bin / Trash.

## Verification

- The browser opens against `http://127.0.0.1:<port>`.
- The initial browser root matches the shell working directory unless `-dir` was provided.
- The session indicator appears only during an active work session.
- Target folders present a review-oriented prompt before session start and a review state inside slideshow.
- Relative move targets resolve from the chosen work root, even inside review folders.
- Hidden files and unsupported file types do not appear in directory listings.
