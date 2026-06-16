import { describe, expect, it } from "vitest";

describe("@anchorsoft/orquesta-core", () => {
  it("loads through the root barrel", async () => {
    const core = await import("@anchorsoft/orquesta-core");

    expect(core).toBeDefined();
  });
});
