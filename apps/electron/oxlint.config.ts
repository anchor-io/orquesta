import { defineConfig } from "oxlint";

export default defineConfig({
    options: {
        typeAware: true,
        typeCheck: true,
    },
    env: {
        node: true,
    },
    ignorePatterns: ["out/**", "dist/**", "build/**", "node_modules/**"],
});
