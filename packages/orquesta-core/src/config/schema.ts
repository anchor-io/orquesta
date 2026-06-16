import * as v from "valibot";

export const SUPPORTED_LOCALES = ["en", "es", "de"] as const;

const LocaleSchema = v.picklist(SUPPORTED_LOCALES);

export const DEFAULT_LOCALE: (typeof SUPPORTED_LOCALES)[number] = "en";

/** The valibot schema and inferred TypeScript types for Orquesta's config. */
export const ConfigSchema = v.object({
  $schema: v.optional(v.string()),
  lang: v.optional(LocaleSchema, DEFAULT_LOCALE),
});

/** The validated output type of the config schema. */
export type Config = v.InferOutput<typeof ConfigSchema>;

/** The input type accepted by the config schema before defaults are applied. */
export type ConfigInput = v.InferInput<typeof ConfigSchema>;
