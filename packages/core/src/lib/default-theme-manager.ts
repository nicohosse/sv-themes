import { createThemeManager, DEFAULT_THEMES } from "./theme-manager.svelte.ts";

export const themeManager = createThemeManager({
	themes: DEFAULT_THEMES,
	initialTheme: "light",
}).match(
	(themeManager) => themeManager,
	(errors) => {
		throw new Error(JSON.stringify(errors));
	},
);
