import { createThemeManager, DEFAULT_THEMES } from "sv-themes";

export const themeManager = createThemeManager({
	themes: DEFAULT_THEMES,
	initialTheme: "light",
	systemThemes: {
		kind: "enabled",
	},
	useSystemTheme: true,
}).match(
	(themeManager) => themeManager,
	(errors) => {
		throw new Error(JSON.stringify(errors.map((error) => error.message)));
	},
);
