import { createAppThemeManager, createThemeManager, createThemes, type ThemeManagerConfig } from "sv-themes";
import { asset } from "$app/paths";

/**
 * The demo registers more than plain light/dark themes so the page can exercise
 * custom class names, per-theme colors, favicons, and explicit system mappings.
 */
export const DEMO_THEMES = createThemes([
	{ id: "light", type: "light", color: "#f5f5f3", favicon: asset("favicon-light.svg") },
	{ id: "dark", type: "dark", color: "#141413", favicon: asset("favicon-dark.svg") },
	{
		id: "forest",
		type: "light",
		className: "theme-forest",
		color: "#eef1ec",
		favicon: asset("favicon-forest.svg"),
	},
	{
		id: "midnight",
		type: "dark",
		className: "theme-midnight",
		color: "#15131a",
		favicon: asset("favicon-midnight.svg"),
	},
]);

export const DEMO_THEME_MANAGER_CONFIG: ThemeManagerConfig<typeof DEMO_THEMES> = {
	themes: DEMO_THEMES,
	initialTheme: "light",
	systemThemes: {
		kind: "enabled",
		// Map the OS preference to a custom theme to show that system resolution
		// is not limited to the first registered light/dark pair.
		mappings: {
			light: "light",
			dark: "midnight",
		},
	},
	useSystemTheme: true,
	attributes: ["class", "data-theme"],
	storage: {
		methods: ["cookie", "localStorage"],
		key: "sv-themes-demo",
		cookie: {
			name: "sv-themes-demo",
		},
	},
};

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
