import { createThemeManager, DEFAULT_THEMES, type ThemeManagerConfig } from "$lib/index.js";
import { expectOk } from "./setup.js";

export const MOCK_THEME_MANAGER_CONFIG: ThemeManagerConfig<typeof DEFAULT_THEMES> = {
	themes: DEFAULT_THEMES,
	initialTheme: "light",
	systemThemes: {
		kind: "enabled",
	},
};

export function createThemeManagerWithMockConfig() {
	return expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
}
