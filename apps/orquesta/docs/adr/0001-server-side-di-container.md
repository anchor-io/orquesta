# Server-side DI container for backend machinery

Orquesta's backend machinery (config watcher, database, future agent harnesses) needs a single initialization point. We decided to introduce a lightweight server-side singleton container that is initialized from `src/hooks.server.ts` via a `main()` function. This keeps SvelteKit hooks free of backend implementation details while giving every backend service a consistent lifecycle (`init`, `isReady`, `shutdown`). Electron wraps the same SvelteKit server, so no Electron-specific service wiring is required.

**Why not per-request initialization?** Starting a file watcher and similar long-lived services on every request would leak resources and race. **Why not auto-import side effects?** Explicit `main()` initialization makes tests and production startup deterministic and avoids surprising module-load behavior.
