import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "esnext",
    outDir: "out",
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, "electron/main.ts"),
      formats: ["es"],
      fileName: () => "main.js",
    },
    rolldownOptions: {
      external: ["electron", /^node:/],
    },
  },
});
