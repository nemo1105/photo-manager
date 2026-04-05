# Local Development Runbook

Last updated: 2026-04-05

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
5. Start sorting using the main button or its configured folder-browsing key.
6. Browse into a configured target folder such as `0`, confirm a bottom-right review toast appears, start there, and verify `restore` returns files to the parent sorting-start folder.
7. Exercise `move`, `delete`, and `restore` using both the buttons and the configured keys.
8. Open Help, use the header `Settings` button, add a `command` action such as `python script.py {{currentFile}}`, save, and confirm it opens an interactive full-screen terminal from the current sort-starting folder while passing the selected image path to the child process.
9. Close the terminal after the process exits and confirm the app returns to the current sorting directory with refreshed file state.
10. Navigate outside the active sorting range and confirm sorting ends automatically with a notice.

## Rollback

- Stop the server with `Ctrl+C`.
- If a test changed your personal config, restore `~/.photo-manager/config.yaml` from version control or a backup copy.
- Move files back out of test target folders or retrieve deleted files from the recycle bin / Trash.

## Verification

- The browser opens against `http://127.0.0.1:<port>`.
- The initial browser root matches the shell working directory unless `-dir` was provided.
- Sorting/review state appears only while sorting is active.
- Target folders present a bottom-right review toast before sorting starts and a review state inside the sorting view.
- Relative move targets resolve from the chosen sort starting folder, even inside review folders.
- `command` actions also start from that same sort-starting folder, even when launched from a review subfolder, while `{{currentFile}}` expands to the selected image's absolute path.
- The command terminal captures keyboard input while open and does not let slideshow shortcuts fire underneath it.
- Hidden files and unsupported file types do not appear in directory listings.
