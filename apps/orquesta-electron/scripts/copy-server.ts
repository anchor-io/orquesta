import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const electronRoot = resolve(import.meta.dirname, "..");
const source = resolve(electronRoot, "../orquesta/build");
const destination = resolve(electronRoot, "build");

await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
