# Orquesta

The SvelteKit web application for anchor-orchestrator, also known as **Anchor Orquesta**. It can be deployed as a web app or wrapped as a desktop application via Electron. The Electron binary is only a wrapper and CLI entry point; it invokes the same SvelteKit server (`orquesta serve`) and never makes server calls itself.

## Language

**Config**:
Runtime user-editable configuration for the Orquesta app, stored as JSONC and validated with valibot.
_Avoid_: Settings, preferences

**Lang**:
The active display language of the Orquesta app, expressed as a single locale string.
_Avoid_: locale (used by paraglide), languageTag

**Locales**:
The complete set of languages the UI is compiled to support, managed by paraglide at build time.
_Avoid_: lang, supportedLanguages
