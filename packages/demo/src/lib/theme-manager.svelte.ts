import { createThemeManager, DEFAULT_THEMES, getErrorMessage } from "sv-themes";

export const themeManager = createThemeManager({
	themes: DEFAULT_THEMES,
	initialTheme: "light",
	enableSystemThemes: true,
	useSystemTheme: true,
}).match(
	(themeManager) => themeManager,
	(errors) => {
		throw new Error(JSON.stringify(errors.map((error) => getErrorMessage(error))));
	},
);
