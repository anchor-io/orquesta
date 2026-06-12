# Context Map

This is a multi-context monorepo. Each package and app owns its own domain context.

## Contexts

| Context | Path | Description |
| ------- | ---- | ----------- |
| Root | `CONTEXT-MAP.md` (this file) | System-wide context and pointers to per-context docs. |

## Per-context docs

As packages and apps are added, list them here:

```
packages/<name>/CONTEXT.md
apps/<name>/CONTEXT.md
```

When working in a specific area, read its `CONTEXT.md` and its local `docs/adr/` directory before making changes.
