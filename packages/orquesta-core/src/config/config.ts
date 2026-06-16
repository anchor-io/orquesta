import { Err, Ok, type Result } from "@anchorsoft/orquesta-shared";
import { ConfigError } from "./errors.ts";
import { ConfigLoader, type ConfigLoaderOptions, type LoadedDocument } from "./loader.ts";
import {
  globalConfigFile,
  nearestProjectConfig,
  nearestWorkspaceConfig,
  projectConfigPath,
  workspaceConfigPath,
  type Env,
} from "./paths.ts";
import type { Config, ConfigInput } from "./schema.ts";
import { ConfigWatcher } from "./watcher.ts";
import { writeConfig } from "./writer.ts";

export interface ConfigManagerOptions extends ConfigLoaderOptions {}

/** High-level config API that combines loading, caching, watching, and writing. */
export class ConfigManager {
  readonly loader: ConfigLoader;
  readonly env: Env;
  #watcher: ConfigWatcher | undefined;

  constructor(options?: ConfigManagerOptions) {
    this.loader = new ConfigLoader(options);
    this.env = this.loader.env;
  }

  /** Returns the merged config for `cwd`. */
  async get(cwd: string): Promise<Result<Config, ConfigError>> {
    return this.loader.get(cwd);
  }

  /** Returns the list of config documents that contributed to the config for `cwd`. */
  async documents(cwd: string): Promise<Result<LoadedDocument[], ConfigError>> {
    return this.loader.documents(cwd);
  }

  /** Clears the in-memory config cache. */
  invalidate(): void {
    this.loader.invalidate();
  }

  /** Starts watching config directories and invalidates the cache on changes. */
  async startWatching(cwd: string): Promise<Result<void, ConfigError>> {
    if (this.#watcher) return Ok(undefined);
    const watcher = new ConfigWatcher(() => this.loader.invalidate());
    this.#watcher = watcher;
    return watcher.start(cwd, this.env);
  }

  /** Stops the active config watcher, if any. */
  async stopWatching(): Promise<void> {
    const watcher = this.#watcher;
    this.#watcher = undefined;
    await watcher?.stop();
  }

  /** Writes a partial update to the global config file, creating it if necessary. */
  async updateGlobal(partial: Partial<ConfigInput>): Promise<Result<void, ConfigError>> {
    const result = await writeConfig(globalConfigFile(this.env), partial);
    if (!result.success) return result;
    this.loader.invalidate();
    return Ok(undefined);
  }

  /** Writes a partial update to the nearest existing project config file. */
  async updateProject(
    cwd: string,
    partial: Partial<ConfigInput>,
  ): Promise<Result<void, ConfigError>> {
    const fileResult = await nearestProjectConfig(cwd);
    if (!fileResult.success) return fileResult;
    const filePath = fileResult.value;
    if (!filePath) {
      return Err(new ConfigError(`No project config found in ${cwd}`, "not_found"));
    }
    const writeResult = await writeConfig(filePath, partial);
    if (!writeResult.success) return writeResult;
    this.loader.invalidate();
    return Ok(undefined);
  }

  /** Writes a partial update to the nearest existing workspace config file. */
  async updateWorkspace(
    cwd: string,
    partial: Partial<ConfigInput>,
  ): Promise<Result<void, ConfigError>> {
    const fileResult = await nearestWorkspaceConfig(cwd);
    if (!fileResult.success) return fileResult;
    const filePath = fileResult.value;
    if (!filePath) {
      return Err(new ConfigError(`No workspace config found in ${cwd}`, "not_found"));
    }
    const writeResult = await writeConfig(filePath, partial);
    if (!writeResult.success) return writeResult;
    this.loader.invalidate();
    return Ok(undefined);
  }

  /** Returns the path where a project config file would live for `cwd`. */
  projectConfigPath(cwd: string): string {
    return projectConfigPath(cwd);
  }

  /** Returns the path where a workspace config file would live for `cwd`. */
  workspaceConfigPath(cwd: string): string {
    return workspaceConfigPath(cwd);
  }
}
