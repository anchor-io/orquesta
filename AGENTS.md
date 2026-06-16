# AGENTS.md

Guidance for AI agents working in this repo.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `anchor-io/orchestrator`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context repo. Read `CONTEXT-MAP.md` at the root, then per-package `CONTEXT.md` files and their local `docs/adr/` directories. See `docs/agents/domain.md`.

## Tooling

- Turborepo
- PNPM

### Turbo

This codebase uses Turborepo. In case turbo configuration needs to be modified, you will find a TURBO.md file with information about how to navigate the particularities of the configuration. if you are not working with turbo, then _do not_ read TURBO.md.
