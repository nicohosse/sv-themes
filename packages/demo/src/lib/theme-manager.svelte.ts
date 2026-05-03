import { createThemeManager, createThemes, DEFAULT_THEMES, getErrorMessage } from "sv-themes";

export const themes = createThemes([
	{
		id: "nature",
		type: "light",
		color: "green",
		css: {
			src: "nature.css",
			lazyLoading: true,
		},
	},
]).match(
	(themes) => themes,
	(errors) => {
		throw new Error(`Failed to create themes: ${JSON.stringify(errors.map((error) => getErrorMessage(error)))}`);
	},
);

export const themeManager = createThemeManager({
	themes: { ...DEFAULT_THEMES, ...themes },
	initialTheme: "light",
}).match(
	(themeManager) => themeManager,
	(errors) => {
		throw new Error(JSON.stringify(errors.map((error) => getErrorMessage(error))));
	},
);
