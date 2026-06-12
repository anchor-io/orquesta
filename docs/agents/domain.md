# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **Per-context `CONTEXT.md`** — each package under `packages/` and each app under `apps/` owns its own context file. Read the ones related to the work at hand.
- **`docs/adr/`** at the repo root — read system-wide ADRs that touch the area you're about to work in.
- **Per-context `docs/adr/`** — also check `packages/<name>/docs/adr/` and `apps/<name>/docs/adr/` for context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context repo:

```
/
├── CONTEXT-MAP.md                    ← index of all contexts
├── docs/adr/                         ← system-wide decisions
├── packages/
│   └── <package-name>/
│       ├── CONTEXT.md                ← context-specific glossary
│       └── docs/adr/                 ← context-specific decisions
└── apps/
    └── <app-name>/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/grill-with-docs`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
