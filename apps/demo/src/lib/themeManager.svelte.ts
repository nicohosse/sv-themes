import { createAppThemeManager, DEFAULT_THEMES } from "sv-themes";

export const { themeManager, registerThemeManager } = createAppThemeManager({
	themes: DEFAULT_THEMES,
	initialTheme: "light",
	systemThemes: {
		kind: "enabled",
	},
	useSystemTheme: true,
}).match(
	(result) => result,
	(errors) => {
		throw new Error(JSON.stringify(errors.map((error) => error.message)));
	},
);
