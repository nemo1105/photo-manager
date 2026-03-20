# Photo Manager Agents Guide

Last updated: 2026-03-20

## Canonical docs

- [Docs index](docs/index.md)
- [Sorting architecture](docs/architecture/photo-sorting-architecture.md)
- [Workflow spec](docs/specs/photo-sorting-workflow-spec.md)
- [Active plans](docs/plans/active/)
- [Completed plans](docs/plans/completed/)
- [Runbooks](docs/runbooks/)
- [Quality](docs/quality/)

## Common tasks

- Sorting behavior changes: update the workflow spec, architecture note, and quality doc in the same change.
- UI or session-flow work: update the active plan under `docs/plans/active/` before or during execution.
- Recurring operator steps: update the runbook instead of leaving the procedure in chat.
- New bugs or risky edge cases: record them in `docs/quality/` even if they are not fixed yet.

## Local rules

- `launchRoot` is fixed at startup. It comes from the CLI `-dir` argument when provided, otherwise from the current working directory. Paths in the web API must stay inside that tree.
- Only an explicit browser action starts a work session. Browsing folders or previewing images must not create a session.
- Relative move targets are resolved from the active session root, not from the current image directory.
- `todo.md` is a scratch note, not the canonical source of plan or quality state. Use `docs/plans/active/` and `docs/quality/` for durable updates.
