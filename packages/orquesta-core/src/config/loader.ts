import fs from "node:fs/promises";
import * as v from "valibot";
import { Err, Ok, type Result } from "@anchorsoft/orquesta-shared";
import { ConfigError, ConfigValidationError, toConfigError } from "./errors.ts";
import { mergeDeep } from "./merge.ts";
import { parseConfig } from "./parse.ts";
import { globalConfigFile, projectConfigFiles, type Env, workspaceConfigFiles } from "./paths.ts";
import { ConfigSchema, type Config } from "./schema.ts";

export interface LoadedDocument {
  /** The path or identifier of the config source. */
  source: string;
  /** The validated config from this source. */
  config: Config;
}

export interface ConfigLoaderOptions {
  /** Environment variables used for XDG paths and overrides. Defaults to `process.env`. */
  env?: Env;
}

interface CacheEntry {
  at: number;
  config: Config;
  docs: LoadedDocument[];
}

const TTL_MS = Number.POSITIVE_INFINITY;

export class ConfigLoader {
  readonly env: Env;
  #cache = new Map<string, CacheEntry>();

  constructor(options?: ConfigLoaderOptions) {
    this.env = options?.env ?? process.env;
  }

  /** Returns the merged config for `cwd`, using the in-memory cache if available. */
  async get(cwd: string): Promise<Result<Config, ConfigError>> {
    const cached = this.#cache.get(cwd);
    if (cached && Date.now() - cached.at < TTL_MS) {
      return Ok(cached.config);
    }

    const docsResult = await this.loadDocuments(cwd);
    if (!docsResult.success) return docsResult;

    const merged = mergeDeep(
      ...docsResult.value.map((document) => document.config as Record<string, unknown>),
    );
    const parsed = v.safeParse(ConfigSchema, merged);
    if (!parsed.success) {
      return Err(new ConfigValidationError("<merged>", parsed.issues));
    }

    this.#cache.set(cwd, { at: Date.now(), config: parsed.output, docs: docsResult.value });
    return Ok(parsed.output);
  }

  /** Returns the list of config documents that contributed to the cached config for `cwd`. */
  async documents(cwd: string): Promise<Result<LoadedDocument[], ConfigError>> {
    const cached = this.#cache.get(cwd);
    if (cached && Date.now() - cached.at < TTL_MS) {
      return Ok(cached.docs);
    }

    const result = await this.get(cwd);
    if (!result.success) return result;

    const entry = this.#cache.get(cwd);
    return Ok(entry?.docs ?? []);
  }

  /** Clears the in-memory config cache so the next `get()` reloads from disk. */
  invalidate(): void {
    this.#cache.clear();
  }

  /** Loads all config documents that apply to `cwd`, from lowest to highest priority. */
  async loadDocuments(cwd: string): Promise<Result<LoadedDocument[], ConfigError>> {
    const documents: LoadedDocument[] = [];

    const globalFile = globalConfigFile(this.env);
    const globalExistsResult = await existsFile(globalFile);
    if (!globalExistsResult.success) return Err(globalExistsResult.error);
    if (globalExistsResult.value) {
      const loadResult = await this.#loadFile(globalFile);
      if (!loadResult.success) return loadResult;
      documents.push(loadResult.value);
    }

    if (!isProjectConfigDisabled(this.env)) {
      const projectFilesResult = await projectConfigFiles(cwd);
      if (!projectFilesResult.success) return Err(projectFilesResult.error);
      for (const filePath of projectFilesResult.value) {
        const loadResult = await this.#loadFile(filePath);
        if (!loadResult.success) return loadResult;
        documents.push(loadResult.value);
      }

      const workspaceFilesResult = await workspaceConfigFiles(cwd);
      if (!workspaceFilesResult.success) return Err(workspaceFilesResult.error);
      for (const filePath of workspaceFilesResult.value) {
        const loadResult = await this.#loadFile(filePath);
        if (!loadResult.success) return loadResult;
        documents.push(loadResult.value);
      }
    }

    if (this.env.ORQUESTA_CONFIG) {
      const loadResult = await this.#loadFile(this.env.ORQUESTA_CONFIG);
      if (!loadResult.success) return loadResult;
      documents.push(loadResult.value);
    }

    if (this.env.ORQUESTA_CONFIG_CONTENT) {
      const loadResult = this.#loadRaw(
        this.env.ORQUESTA_CONFIG_CONTENT,
        "env:ORQUESTA_CONFIG_CONTENT",
      );
      if (!loadResult.success) return loadResult;
      documents.push(loadResult.value);
    }

    return Ok(documents);
  }

  async #loadFile(filePath: string): Promise<Result<LoadedDocument, ConfigError>> {
    try {
      const text = await fs.readFile(filePath, "utf-8");
      return this.#loadRaw(text, filePath);
    } catch (error) {
      return Err(toConfigError(error));
    }
  }

  #loadRaw(text: string, source: string): Result<LoadedDocument, ConfigError> {
    const parseResult = parseConfig(text, source);
    if (!parseResult.success) return parseResult;

    const validateResult = validateConfig(parseResult.value, source);
    if (!validateResult.success) return validateResult;

    return Ok({ source, config: validateResult.value });
  }
}

function validateConfig(raw: unknown, source: string): Result<Config, ConfigValidationError> {
  const result = v.safeParse(ConfigSchema, raw);
  if (!result.success) {
    return Err(new ConfigValidationError(source, result.issues));
  }
  return Ok(result.output);
}

async function existsFile(filePath: string): Promise<Result<boolean, ConfigError>> {
  try {
    const stat = await fs.stat(filePath);
    return Ok(stat.isFile());
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return Ok(false);
    }
    return Err(toConfigError(error));
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function isProjectConfigDisabled(env: Env): boolean {
  return env.ORQUESTA_DISABLE_PROJECT_CONFIG === "1";
}
