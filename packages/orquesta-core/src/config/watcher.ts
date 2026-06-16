import watcher from "@parcel/watcher";
import fs from "node:fs/promises";
import path from "node:path";
import { Err, Ok, type Result } from "@anchorsoft/orquesta-shared";
import { ConfigError, toConfigError } from "./errors.ts";
import { globalConfigDir, type Env } from "./paths.ts";

const IGNORE = ["node_modules", ".git", ".svelte-kit", "build", "dist", ".parcel-cache"];

// TODO: Consider extracting file watching into a standalone package if it is
// reused by other core modules. For now it lives next to config because the
// only consumer is ConfigLoader's cache invalidation.

export class ConfigWatcher {
  #subscription: (() => Promise<void>) | undefined;

  constructor(private readonly onChange: () => void) {}

  /** Starts watching global and project config directories. */
  async start(cwd: string, env: Env): Promise<Result<void, ConfigError>> {
    if (this.#subscription) {
      return Ok(undefined);
    }

    try {
      const dirs = new Set<string>();
      await fs.mkdir(globalConfigDir(env), { recursive: true });
      dirs.add(globalConfigDir(env));
      dirs.add(path.resolve(cwd));

      const subscriptions: watcher.AsyncSubscription[] = [];
      for (const dir of dirs) {
        const sub = await watcher.subscribe(
          dir,
          (err) => {
            if (err) {
              console.error("config watcher error", err);
              return;
            }
            this.onChange();
          },
          { ignore: IGNORE },
        );
        subscriptions.push(sub);
      }

      const unsubscribe = async () => {
        await Promise.all(subscriptions.map((subscription) => subscription.unsubscribe()));
      };
      this.#subscription = unsubscribe;

      return Ok(undefined);
    } catch (error) {
      return Err(toConfigError(error, "watch_failed"));
    }
  }

  /** Stops the active config watcher, if any. */
  async stop(): Promise<void> {
    const unsubscribe = this.#subscription;
    this.#subscription = undefined;
    await unsubscribe?.();
  }
}
