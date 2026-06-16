# Turbo Setup

This repo uses Turborepo to coordinate package-local scripts across the pnpm workspace. The root scripts are intentionally thin wrappers around `turbo run`; package scripts own the real work.

## Tooling

- Turbo is provided by `mise.toml` (`turbo = "2.9.16"`). There is no root `turbo` npm dependency on purpose.
- The warning about no locally installed `turbo` is expected when using the mise-provided binary.
- Write `turbo run <task>` in `package.json`, CI, and docs. The shorter `turbo <task>` form is only for ad hoc terminal use.

## Root Scripts

The root [package.json](./package.json) delegates to Turbo:

- `pnpm run lint` runs `format:check` and `lint` across packages.
- `pnpm run check` runs TypeScript/Svelte checks across packages.
- `pnpm run test:unit` runs non-watch unit tests across packages.
- `pnpm run build` runs package build tasks.
- `pnpm run package` builds the Electron distributable path via the Turbo graph.
- `*:affected` variants use Turbo's `--affected` mode for changed packages and dependents.

Do not move package task logic into the root manifest. Add scripts to package manifests first, then register or tune the task in `turbo.json`.

## Task Graph

The root [turbo.json](./turbo.json) defines common tasks and a `transit` task:

```json
"transit": {
  "dependsOn": ["^transit"]
}
```

`check`, `lint`, `test`, and `test:unit` depend on `transit` instead of `^check`, `^lint`, or `^test`. This lets those tasks run in parallel while still invalidating their cache when dependency package sources change. Do not replace this with `^lint` or `^check`; that would serialize checks and make the workspace slower.

`format` is uncached because it writes files. `format:check` is cached because it only verifies formatting.

## Package Configs

Use package-level `turbo.json` files for package-specific outputs or env requirements.

### `@anchorsoft/orquesta`

[apps/orquesta/turbo.json](./apps/orquesta/turbo.json) owns the SvelteKit build details:

- `build` outputs `build/**` and `.svelte-kit/**`, excluding `.svelte-kit/cache/**`.
- `build` hashes local `.env` files and `DATABASE_URL`/`NODE_ENV`.
- `test` and `test:e2e` also hash local `.env` files and `DATABASE_URL`.

Keep env files package-local. Do not add root `.env` hashing unless the repo intentionally introduces a root env contract.

### `@anchorsoft/orquesta-electron`

[apps/orquesta-electron/turbo.json](./apps/orquesta-electron/turbo.json) owns the Electron wrapper details:

- `build` runs the Electron Vite build and outputs `out/**`.
- `copy:server` depends on `@anchorsoft/orquesta#build` and copies `apps/orquesta/build` into the Electron package's `build/**`.
- `package` depends on local `build`, `copy:server`, `format:check`, `check`, and `lint`, then writes `dist/**`.

Do not reintroduce package-level chains like `build:server` or `pnpm --dir ../.. --filter ... build`. The Turbo graph owns that ordering now.

### Source-First Packages

`@anchorsoft/orquesta-core` and `@anchorsoft/orquesta-shared` are source-first packages today. They do not emit build artifacts. If either package gains a real `build` script later, add correct outputs close to that package, and make sure workspace dependencies are declared so `^build` can order work correctly.

## Cross-Platform Scripts

Some scripts use POSIX-style inline environment variables, for example:

```json
"test:unit": "TMPDIR=/tmp vitest run"
```

To make those scripts work on Windows, pnpm's bash-like shell emulator is enabled at the workspace level:

```yaml
shellEmulator: true
```

The same setting is also present as `shell-emulator=true` in package `.npmrc` files for compatibility and visibility. pnpm 11 reads non-registry project settings from `pnpm-workspace.yaml`, so keep the workspace setting unless every POSIX-style script is converted.

Run these scripts through `pnpm run`. Node's `node --run` does not use pnpm's shell emulator.

## Validation

Before changing Turbo behavior, use dry-runs to inspect the graph:

```bash
turbo run lint --dry
turbo run build --dry
turbo run package --filter @anchorsoft/orquesta-electron --dry
```

After changing task configuration or package scripts, run:

```bash
pnpm run lint
pnpm run check
pnpm run test:unit
```

Run the full Electron package command only when you need to validate packaging artifacts; the dry-run is usually enough to confirm graph shape.

## References

- Turborepo task configuration: https://turborepo.dev/docs/reference/configuration
- pnpm `shellEmulator`: https://pnpm.io/settings#shellemulator
