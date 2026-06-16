import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ConfigManager } from "./index.ts";
import type { Env } from "./paths.ts";

describe("config", () => {
  let tmp: string;
  let env: Env;
  let manager: ConfigManager;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "orquesta-config-"));
    env = {
      XDG_CONFIG_HOME: path.join(tmp, "config"),
      XDG_DATA_HOME: path.join(tmp, "data"),
      ORQUESTA_CONFIG: undefined,
      ORQUESTA_CONFIG_CONTENT: undefined,
      ORQUESTA_DISABLE_PROJECT_CONFIG: undefined,
    };
    manager = new ConfigManager({ env });
  });

  afterEach(async () => {
    await manager.stopWatching();
  });

  it("returns the base locale when no config files exist", async () => {
    const result = await manager.get(tmp);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.lang).toBe("en");
  });

  it("writes and reads the global config", async () => {
    const writeResult = await manager.updateGlobal({ lang: "es" });
    expect(writeResult.success).toBe(true);

    const result = await manager.get(tmp);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.lang).toBe("es");
  });

  it("writes and reads a project config", async () => {
    await fs.writeFile(path.join(tmp, "orquesta.jsonc"), '{ "lang": "en" }');

    const writeResult = await manager.updateProject(tmp, { lang: "es" });
    expect(writeResult.success).toBe(true);

    const result = await manager.get(tmp);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.lang).toBe("es");

    await expect(fs.readFile(path.join(tmp, "orquesta.jsonc"), "utf-8")).resolves.toContain(
      '"lang": "es"',
    );
  });

  it("returns an error when updating a missing project config", async () => {
    const result = await manager.updateProject(tmp, { lang: "es" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("No project config found");
    }
  });

  it("writes and reads a workspace config", async () => {
    await fs.mkdir(path.join(tmp, ".orquesta"), { recursive: true });
    await fs.writeFile(path.join(tmp, ".orquesta", "orquesta.jsonc"), '{ "lang": "en" }');

    const writeResult = await manager.updateWorkspace(tmp, { lang: "es" });
    expect(writeResult.success).toBe(true);

    const result = await manager.get(tmp);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.lang).toBe("es");

    await expect(
      fs.readFile(path.join(tmp, ".orquesta", "orquesta.jsonc"), "utf-8"),
    ).resolves.toContain('"lang": "es"');
  });

  it("returns an error when updating a missing workspace config", async () => {
    const result = await manager.updateWorkspace(tmp, { lang: "es" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("No workspace config found");
    }
  });

  it("merges layers from lowest to highest priority", async () => {
    const writeResult = await manager.updateGlobal({ lang: "es" });
    expect(writeResult.success).toBe(true);

    await fs.mkdir(path.join(tmp, "nested"), { recursive: true });
    await fs.writeFile(path.join(tmp, "orquesta.jsonc"), '{ "lang": "en" }');
    await fs.mkdir(path.join(tmp, ".orquesta"), { recursive: true });
    await fs.writeFile(path.join(tmp, ".orquesta", "orquesta.jsonc"), '{ "lang": "es" }');

    const result = await manager.get(tmp);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.lang).toBe("es");
  });

  it("applies the ORQUESTA_CONFIG_CONTENT override", async () => {
    const managerWithOverride = new ConfigManager({
      env: { ...env, ORQUESTA_CONFIG_CONTENT: '{ "lang": "es" }' },
    });
    const writeResult = await managerWithOverride.updateGlobal({ lang: "en" });
    expect(writeResult.success).toBe(true);

    const result = await managerWithOverride.get(tmp);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.lang).toBe("es");
  });

  it("returns a validation error for an invalid lang", async () => {
    await fs.writeFile(path.join(tmp, "orquesta.jsonc"), '{ "lang": "fr" }');
    const result = await manager.get(tmp);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("orquesta.jsonc");
    }
  });

  it("invalidates the cache when a config file changes on disk", async () => {
    const writeResult = await manager.updateGlobal({ lang: "en" });
    expect(writeResult.success).toBe(true);

    const startResult = await manager.startWatching(tmp);
    expect(startResult.success).toBe(true);

    const before = await manager.get(tmp);
    expect(before.success).toBe(true);
    if (!before.success) return;
    expect(before.value.lang).toBe("en");

    await fs.writeFile(path.join(tmp, "config", "orquesta", "orquesta.jsonc"), '{ "lang": "es" }');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const after = await manager.get(tmp);
    expect(after.success).toBe(true);
    if (!after.success) return;
    expect(after.value.lang).toBe("es");
  });
});
