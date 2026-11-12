import { createAppThemeManager, createThemeManager, DEFAULT_THEMES, type ThemeManagerConfig } from "sv-themes";

export const DEMO_THEME_MANAGER_CONFIG = {
	themes: DEFAULT_THEMES,
	initialTheme: "light",
	systemThemes: {
		kind: "enabled",
	},
	useSystemTheme: true,
} as const satisfies ThemeManagerConfig<typeof DEFAULT_THEMES>;

function throwThemeManagerErrors(errors: { message: string }[]): never {
	throw new Error(JSON.stringify(errors.map((error) => error.message)));
}

/**
 * The client-side singleton used by Svelte components.
 */
export const { themeManager, registerThemeManager, getThemeManager } = createAppThemeManager(
	DEMO_THEME_MANAGER_CONFIG,
).match(
	(result) => result,
	(errors) => throwThemeManagerErrors(errors),
);

/**
 * Creates a fresh manager for a single SSR request. Reusing a module-global manager
 * during SSR would allow one request's persisted theme to leak into another.
 */
export function createRequestThemeManager() {
	return createThemeManager(DEMO_THEME_MANAGER_CONFIG).match(
		(manager) => manager,
		(errors) => throwThemeManagerErrors(errors),
	);
}
