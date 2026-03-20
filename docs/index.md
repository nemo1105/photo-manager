# Docs Index

Last updated: 2026-03-20

## Canonical map

- [AGENTS.md](../AGENTS.md): thin operator map for humans and agents.
- [docs/architecture/](architecture/): stable design truth for session, sorting, and path-handling rules.
- [docs/architecture/photo-sorting-architecture.md](architecture/photo-sorting-architecture.md): current implementation details for browse, preview, slideshow, and action execution.
- [docs/specs/](specs/): problem statements, scope, constraints, and acceptance criteria.
- [docs/specs/photo-sorting-workflow-spec.md](specs/photo-sorting-workflow-spec.md): canonical product behavior for work sessions and image actions.
- [docs/plans/active/](plans/active/): live execution state for current follow-up work.
- [docs/plans/completed/](plans/completed/): completed execution history after verification.
- [docs/runbooks/](runbooks/): repeatable local development and verification procedures.
- [docs/runbooks/local-development-runbook.md](runbooks/local-development-runbook.md): how to run, verify, and safely exercise the app locally.
- [docs/quality/](quality/): known issues, test coverage, debt, and follow-ups.
- [docs/quality/current-quality.md](quality/current-quality.md): current bugs, UX gaps, and missing test coverage.

## Update rules

- Update `AGENTS.md` when canonical doc paths or local repo rules change.
- Update the workflow spec before or while changing sorting/session behavior.
- Update the architecture note when invariants, path rules, or API contracts change.
- Update plans as work progresses, and move verified completed plans out of `docs/plans/active/`.
- Update the quality doc whenever a new bug, regression risk, or missing test is discovered.
- Keep `todo.md` as scratch only; do not treat it as canonical once the same topic exists in `docs/`.

## Freshness checks

- Keep `Last updated: YYYY-MM-DD` near the top of each canonical markdown doc.
- Keep `Status:` near the top of plan and quality docs.
- Prefer links over duplicated prose.
