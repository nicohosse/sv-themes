/**
 * Browser/SPA-only entry point.
 *
 * This module intentionally avoids importing Svelte components, contexts, or
 * browser-dependent modules so it can be used from a Vite config, a build script,
 * or an inline HTML bootstrap without a Svelte compiler or DOM.
 */

export { getThemeScript, safeSerializeArgument, type ThemeScriptArguments, themeScript } from "./core/script.js";

export {
	createThemes,
	DEFAULT_THEMES,
	type Theme,
	type ThemeRecord,
	type ThemeType,
} from "./core/theme/index.js";

export {
	DEFAULT_STORAGE_HYBRID,
	HYBRID_STORAGE_METHODS,
	STORAGE_METHOD_PRIORITY,
	type StorageMethod,
	type StorageOptions,
	type SystemTheme,
	type SystemThemes,
	type ThemeAttribute,
} from "./core/themeManager/themeManager.js";
