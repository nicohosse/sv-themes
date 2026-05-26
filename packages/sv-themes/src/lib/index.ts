export { themeSelector } from "./actions/theme-selector.svelte.js";

export { default as ForceTheme } from "./components/force-theme/ForceTheme.svelte";

export type { LibError } from "./core/errors.js";

export {
	createThemes,
	DEFAULT_THEMES,
	type Theme,
	type ThemeRecord,
} from "./core/theme/index.js";

export {
	type AfterThemeChangeEvent,
	type BeforeThemeChangeEvent,
	createThemeManager,
	DEFAULT_STORAGE_HYBRID,
	type ForcedThemeEvent,
	getPersistedTheme,
	HYBRID_STORAGE_METHODS,
	persistTheme,
	registerThemeManager,
	type StorageMethod,
	type StorageOptions,
	type SystemTheme,
	type SystemThemeChangeEvent,
	type ThemeAttribute,
	type ThemeChangeEvent,
	type ThemeManager,
	type ThemeManagerConfig,
	ThemeManagerError,
	type ThemesOf,
	type UnforcedThemeEvent,
} from "./core/theme-manager/index.js";
