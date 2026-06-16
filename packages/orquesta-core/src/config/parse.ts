import { parse as parseJsonc, type ParseError } from "jsonc-parser";
import { Err, Ok, type Result } from "../result.ts";
import { ConfigParseError } from "./errors.ts";

/** Parses JSONC text into a plain JavaScript value. */
export function parseConfig(text: string, sourcePath: string): Result<unknown, ConfigParseError> {
  const errors: ParseError[] = [];
  const result = parseJsonc(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    return Err(new ConfigParseError(sourcePath, errors));
  }
  return Ok(result);
}
