import { modify, applyEdits } from "jsonc-parser";
import fs from "node:fs/promises";
import path from "node:path";
import { Err, Ok, type Result } from "../result.ts";
import { ConfigError, toConfigError } from "./errors.ts";
import type { ConfigInput } from "./schema.ts";

/** Applies a partial update to a JSONC config file, preserving comments and formatting. */
export async function writeConfig(
  filePath: string,
  partial: Partial<ConfigInput>,
): Promise<Result<void, ConfigError>> {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const text = await fs.readFile(filePath, "utf-8").catch(() => "{\n}");
    const patched = patchJsonc(text, partial);
    await fs.writeFile(filePath, patched, "utf-8");
    return Ok(undefined);
  } catch (error) {
    return Err(toConfigError(error));
  }
}

function patchJsonc(text: string, updates: Partial<ConfigInput>): string {
  for (const [key, value] of Object.entries(updates)) {
    const edits = modify(text, [key], value, {
      formattingOptions: { insertSpaces: true, tabSize: 2 },
    });
    text = applyEdits(text, edits);
  }
  return text;
}
