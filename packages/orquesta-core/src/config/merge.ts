/** Merges config layers: scalars overwrite, objects recurse, arrays concat and deduplicate. */
export function mergeDeep(...objects: Record<string, unknown>[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const obj of objects) {
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && Array.isArray(out[key])) {
        out[key] = [...new Set([...(out[key] as unknown[]), ...value])];
      } else if (isPlainObject(value) && isPlainObject(out[key])) {
        out[key] = mergeDeep(out[key] as Record<string, unknown>, value);
      } else {
        out[key] = value;
      }
    }
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;
}
