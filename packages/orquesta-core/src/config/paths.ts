import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Err, Ok, type Result } from "@anchorsoft/orquesta-shared";
import { ConfigError, toConfigError } from "./errors.ts";

const APP = "orquesta";
const FILE = "orquesta.jsonc";

export type Env = Record<string, string | undefined>;

export function globalConfigDir(env: Env): string {
  const base = env.ORQUESTA_CONFIG_DIR ?? env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(base, APP);
}

/** Returns the full path to the global Orquesta config file. */
export function globalConfigFile(env: Env): string {
  return path.join(globalConfigDir(env), FILE);
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

/** Returns existing project config files from `startDir` up to the filesystem root. */
export async function projectConfigFiles(
  startDir: string,
  stopDir?: string,
): Promise<Result<string[], ConfigError>> {
  return walkConfigFiles(startDir, FILE, stopDir);
}

/** Returns existing workspace config files from `startDir` up to the filesystem root. */
export async function workspaceConfigFiles(
  startDir: string,
  stopDir?: string,
): Promise<Result<string[], ConfigError>> {
  return walkConfigFiles(startDir, path.join(".orquesta", FILE), stopDir);
}

async function walkConfigFiles(
  startDir: string,
  relativeFile: string,
  stopDir?: string,
): Promise<Result<string[], ConfigError>> {
  const root = stopDir ?? path.parse(startDir).root;
  let dir = path.resolve(startDir);
  const files: string[] = [];

  while (true) {
    const candidate = path.join(dir, relativeFile);
    const existsResult = await existsFile(candidate);
    if (!existsResult.success) return Err(existsResult.error);
    if (existsResult.value) files.push(candidate);

    if (dir === root || dir === stopDir) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return Ok(files);
}

/** Returns the nearest existing project config file, or `undefined` if none exists. */
export async function nearestProjectConfig(
  cwd: string,
): Promise<Result<string | undefined, ConfigError>> {
  const filesResult = await projectConfigFiles(cwd);
  if (!filesResult.success) return Err(filesResult.error);
  return Ok(filesResult.value[0]);
}

/** Returns the path where a project config file would live, regardless of whether it exists. */
export function projectConfigPath(cwd: string): string {
  return path.resolve(cwd, FILE);
}

/** Returns the nearest existing workspace config file, or `undefined` if none exists. */
export async function nearestWorkspaceConfig(
  cwd: string,
): Promise<Result<string | undefined, ConfigError>> {
  const filesResult = await workspaceConfigFiles(cwd);
  if (!filesResult.success) return Err(filesResult.error);
  return Ok(filesResult.value[0]);
}

/** Returns the path where a workspace config file would live, regardless of whether it exists. */
export function workspaceConfigPath(cwd: string): string {
  return path.resolve(cwd, ".orquesta", FILE);
}
