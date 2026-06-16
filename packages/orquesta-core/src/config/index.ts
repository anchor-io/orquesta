export { ConfigManager, type ConfigManagerOptions } from "./config.ts";
export {
  ConfigError,
  ConfigParseError,
  ConfigValidationError,
  isNodeError,
  toConfigError,
  type ConfigErrorCode,
} from "./errors.ts";
export { ConfigLoader, type ConfigLoaderOptions, type LoadedDocument } from "./loader.ts";
export { mergeDeep } from "./merge.ts";
export { parseConfig } from "./parse.ts";
export {
  globalConfigDir,
  globalConfigFile,
  nearestProjectConfig,
  nearestWorkspaceConfig,
  projectConfigFiles,
  projectConfigPath,
  workspaceConfigFiles,
  workspaceConfigPath,
  type Env,
} from "./paths.ts";
export {
  ConfigSchema,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type Config,
  type ConfigInput,
} from "./schema.ts";
export { ConfigWatcher } from "./watcher.ts";
export { writeConfig } from "./writer.ts";
