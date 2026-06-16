# Orquesta Core Context

`@anchorsoft/orquesta-core` owns orchestration-domain TypeScript that can be shared by the Orquesta apps without depending on a specific UI or runtime shell.

## Boundaries

- The public package surface is the root barrel at `src/index.ts`.
- Keep `package.json` `exports` limited to `.`; do not expose deep imports.
- Keep Electron, SvelteKit, and other shell-specific code in their app packages.
- Use Vitest for package-level unit tests in a Node environment.

## Current State

The package is scaffolded as a private source-first workspace package. Add public APIs to `src/index.ts` as orchestration primitives move into core.
