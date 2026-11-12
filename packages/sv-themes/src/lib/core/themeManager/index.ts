export {
	createAppThemeManager,
	createThemeManager,
	type ThemeManagerConfig,
} from "./createThemeManager.svelte.js";

export {
	cleanupThemeClasses,
	registerMediaListener,
	registerStorageListener,
	registerThemeManager,
	updateAttributes,
	updateDom,
	updateMetaTags,
} from "./dom.svelte.js";

export { ThemeManagerError } from "./errors.js";

export type {
	AfterThemeChangeEvent,
	BeforeThemeChangeEvent,
	ForcedThemeEvent,
	Listener,
	SystemThemeChangeEvent,
	ThemeChangeEvent,
	ThemeManagerEvents,
	ThemeSelectEvent,
	UnforcedThemeEvent,
} from "./events.js";

export {
	createForceThemeRegistry,
	type ForceThemeRegistry,
	type ForceThemeRequest,
	isBlockedByAncestor,
} from "./forceThemeRegistry.svelte.js";

export { getPersistedTheme, persistTheme } from "./persistence.js";

export { type ResolvedThemeManagerConfig, resolveThemeManagerConfig } from "./resolver.js";

export {
	DEFAULT_STORAGE_HYBRID,
	HYBRID_STORAGE_METHODS,
	INTERNAL as THEME_MANAGER_INTERNAL,
	STORAGE_METHOD_PRIORITY,
	type StorageMethod,
	type StorageOptions,
	type SystemTheme,
	type SystemThemes,
	type ThemeAttribute,
	type ThemeManager,
	type ThemesOf,
	type ThemeUpdateConfig,
} from "./themeManager.js";

export {
	validateRequestedTheme,
	validateSystemTheme,
	validateThemeManagerConfig,
	validateThemes,
} from "./validators.js";
