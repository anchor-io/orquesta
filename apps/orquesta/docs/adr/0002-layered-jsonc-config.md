# Layered JSONC config with parcel watcher

Orquesta's runtime configuration is loaded from multiple layered sources and kept in sync with disk via a file watcher. We decided on JSONC as the format, valibot for schema validation, `@parcel/watcher` for file watching, and XDG-compliant paths. Configuration layers are merged deep for objects, concatenated and deduplicated for arrays, and overwritten for scalars.

Sources, lowest to highest priority:

1. Global config at `~/.config/orquesta/orquesta.jsonc`.
2. Project configs (`orquesta.jsonc`) discovered by walking up from `cwd`.
3. Workspace configs (`.orquesta/orquesta.jsonc`) discovered by walking up from `cwd`.
4. `ORQUESTA_CONFIG` file override.
5. `ORQUESTA_CONFIG_CONTENT` inline JSON override.

We picked JSONC over YAML/TOML because the project already uses JSON-based tooling and we want editor support and comments. We picked `@parcel/watcher` because it was selected for another upcoming feature and sharing one watcher keeps native dependency surface small. We watch the specific resolved config files rather than entire directory trees to avoid gitignore complexity and noisy reloads.

**Why not project-config writes?** We only expose write APIs for global and workspace configs. Project `orquesta.jsonc` files are treated as committed/defaults; `.orquesta/` is the user-local writable layer, similar to `.gitignore` vs `.env`.
