export { themeSelector } from "./actions/themeSelector.svelte.js";

export { default as ForceTheme } from "./components/forceTheme/ForceTheme.svelte";

export {
	getThemeManager,
	isThemeManagerRegistered,
	setThemeManager,
} from "./contexts/themeManagerContext.svelte.js";

export type { LibError } from "./core/index.js";

export { createThemeHandle, type ThemeHandleSource } from "./core/kit.js";

export {
	getThemeScript,
	safeSerializeArgument,
	type ThemeScriptArguments,
	themeScript,
} from "./core/script.js";

export {
	createThemeSnapshot,
	escapeAttribute,
	type ThemeManagerSnapshot,
	type ThemeManagerSnapshotOptions,
} from "./core/snapshot.js";

export {
	createThemes,
	DEFAULT_THEMES,
	type Theme,
	type ThemeRecord,
	type ThemeType,
} from "./core/theme/index.js";

export {
	type AfterThemeChangeEvent,
	type BeforeThemeChangeEvent,
	cleanupThemeClasses,
	createAppThemeManager,
	createForceThemeRegistry,
	createThemeManager,
	DEFAULT_STORAGE_HYBRID,
	type ForcedThemeEvent,
	type ForceThemeRegistry,
	type ForceThemeRequest,
	getPersistedTheme,
	HYBRID_STORAGE_METHODS,
	type Listener,
	persistTheme,
	registerMediaListener,
	registerStorageListener,
	registerThemeManager,
	type StorageMethod,
	type StorageOptions,
	type SystemTheme,
	type SystemThemeChangeEvent,
	type SystemThemes,
	type ThemeAttribute,
	type ThemeChangeEvent,
	type ThemeManager,
	type ThemeManagerConfig,
	ThemeManagerError,
	type ThemeManagerEvents,
	type ThemeSelectEvent,
	type ThemesOf,
	type ThemeUpdateConfig,
	type UnforcedThemeEvent,
	updateAttributes,
	updateDom,
	updateMetaTags,
} from "./core/themeManager/index.js";
