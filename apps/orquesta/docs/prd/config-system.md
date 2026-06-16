# Config System PRD

## Problem Statement

Orquesta needs a runtime configuration system that can be edited by users via JSONC files and kept in sync with the running server. The first setting is the active display language (`lang`), but the architecture must support many more settings later, real-time client sync in the future, and both web and Electron deployments without changing the core code.

## Solution

Introduce a server-side JSONC configuration layer in `$lib/config`. It validates with valibot, loads from global, project, workspace, and environment sources, merges layers predictably, and uses `@parcel/watcher` to invalidate the in-memory cache when files change on disk. A minimal server-side container initialized from `src/hooks.server.ts` starts the watcher and other backend machinery in one place.

## User Stories

1. As an Orquesta user, I want to set my preferred language in `~/.config/orquesta/orquesta.jsonc`, so that the app respects my global preference across all projects.
2. As an Orquesta user, I want to add a `.orquesta/orquesta.jsonc` file in a project directory, so that I can override my global config for that project.
3. As an Orquesta user, I want to add comments and trailing commas to my config files, so that I can document why certain values are set.
4. As an Orquesta developer, I want config changes on disk to be picked up without restarting the server, so that I can iterate quickly.
5. As an Orquesta developer, I want invalid config to produce a clear validation error with the offending file path, so that I can fix it quickly.
6. As an Orquesta developer, I want tests to run against isolated temporary config directories, so that my local `~/.config/orquesta` does not affect test outcomes.
7. As an Orquesta developer, I want a JSON schema generated at build time, so that we can later publish it and give users IDE autocomplete.
8. As an Orquesta developer, I want the config system to be initialized from a single `main()` call in `src/hooks.server.ts`, so that backend machinery has one obvious lifecycle entry point.
9. As an Orquesta developer, I want the Electron wrapper to require no special config wiring, so that the same SvelteKit server code runs unchanged.
10. As an Orquesta developer, I want environment variables to override file-based config in tests and CI, so that I can inject ephemeral configuration.

## Implementation Decisions

- **Format:** JSONC (JSON with comments and trailing commas), parsed with `jsonc-parser`.
- **Schema:** valibot. The first schema only contains `lang`, which must be one of paraglide's configured `locales`. It defaults to paraglide's `baseLocale`.
- **Schema strictness:** Unknown keys are rejected by default, matching the existing research plan. We can relax later with `v.looseObject` if migration needs arise.
- **Global config path:** `~/.config/orquesta/orquesta.jsonc`, overridable with `ORQUESTA_CONFIG_DIR`.
- **Project config:** `orquesta.jsonc` files discovered by walking up from `cwd`; outer directories have lower priority than inner directories.
- **Workspace config:** `.orquesta/orquesta.jsonc` files discovered by walking up from `cwd`; higher priority than a bare `orquesta.jsonc` in the same directory.
- **Write API:** `updateGlobal(partial)` writes to (and creates if needed) the global config; `updateProject(cwd, partial)` writes to the nearest existing `orquesta.jsonc`; `updateWorkspace(cwd, partial)` writes to the nearest existing `.orquesta/orquesta.jsonc`. Project and workspace files must already exist.
- **Merge semantics:** scalars overwrite, objects deep-merge, arrays concatenate and deduplicate.
- **Watcher:** `@parcel/watcher` watches the specific resolved config files. On change, the cache is invalidated and the next `get()` reloads. The watcher is started by the server container from `src/hooks.server.ts`.
- **Cache:** In-memory cache keyed by `cwd`. Explicit `invalidate()` is also exposed.
- **Environment overrides:** `ORQUESTA_CONFIG` (single file), `ORQUESTA_CONFIG_CONTENT` (inline JSONC), `ORQUESTA_CONFIG_DIR` (global dir), `ORQUESTA_DISABLE_PROJECT_CONFIG` (skip local discovery).
- **JSON schema:** Generated at build time to `static/orquesta-schema.json` using `@valibot/to-json-schema`. Not referenced in config files until a public schema URL is available.
- **Server container:** A lightweight singleton in `src/lib/server/container.ts` with `init()`, `isReady()`, and `shutdown()` methods. `src/hooks.server.ts` calls `main()`, which initializes the container.
- **Electron:** No Electron-specific code. The Electron binary invokes the same SvelteKit server, so the container initializes exactly as it does in the web deployment.

## Testing Decisions

- **Unit tests** for `merge`, `parse`, `paths`, and `schema` using Vitest. Tests must set `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `ORQUESTA_CONFIG_DIR`, and `ORQUESTA_DISABLE_PROJECT_CONFIG` before importing config modules.
- **Integration tests** for the full load/merge/watch flow in a temporary directory, verifying that writing a file triggers a reload.
- **Good tests** assert external behavior: after writing a config file, `get()` returns the new merged value. They do not assert internal cache state or watcher implementation details.
- **Prior art:** `src/lib/vitest-examples/greet.spec.ts` shows the existing Vitest setup.

## Out of Scope

- Client-side config stores or live push to browser tabs.
- WebSocket / Server-Sent Events for config sync.
- SvelteKit API routes or `event.locals.config` wiring.
- Public schema URL and automatic `"$schema"` injection into config files.
- Migration/upgrade logic for config files.
- More than one config key in v1 (`lang` is the only key).

## Further Notes

- The research plan in `/research/config-system-plan.md` was the starting point, but several decisions diverged: product name (`orquesta` vs `anchor-orchestrator`), `@parcel/watcher` instead of `chokidar`, location (`$lib/config` instead of `$lib/server/config`), and explicit `main()` initialization via a server container.
- The container is intentionally minimal. Future backend services (database, agent harness, job queue) should register their startup and shutdown logic there rather than in `hooks.server.ts`.
- `@parcel/watcher` is a native dependency. The install must succeed for the target Node platform; Electron does not introduce an additional native platform because the server still runs in Node.
