import type { ParseError } from "jsonc-parser";
import * as v from "valibot";

export type ConfigErrorCode =
  | "not_found"
  | "permission_denied"
  | "parse_failed"
  | "validation_failed"
  | "watch_failed"
  | "unknown";

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly code: ConfigErrorCode,
    cause?: Error,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ConfigError";
  }
}

export class ConfigParseError extends ConfigError {
  constructor(
    public readonly source: string,
    public readonly errors: ParseError[],
  ) {
    super(`Failed to parse config: ${source}`, "parse_failed");
  }
}

export class ConfigValidationError extends ConfigError {
  constructor(
    public readonly source: string,
    public readonly issues: v.BaseIssue<unknown>[],
  ) {
    super(`Invalid config: ${source}`, "validation_failed");
  }
}

export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export function toConfigError(error: unknown, code: ConfigErrorCode = "unknown"): ConfigError {
  if (error instanceof ConfigError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : new Error(message);

  if (isNodeError(error)) {
    switch (error.code) {
      case "ENOENT":
        return new ConfigError(message, "not_found", cause);
      case "EACCES":
      case "EPERM":
        return new ConfigError(message, "permission_denied", cause);
    }
  }

  return new ConfigError(message, code, cause);
}
