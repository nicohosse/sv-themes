import type { SystemTheme } from "./theme-manager.svelte.ts";

export type ThemeManagerError =
	| { type: "NoThemes" }
	| { type: "ThemeNotFound" }
	| { type: "SystemThemeUnassigned"; systemTheme: SystemTheme }
	| { type: "SystemThemesDisabled" };

export const ThemeManagerError = {
	noThemes: { type: "NoThemes" } as const satisfies ThemeManagerError,
	themeNotFound: { type: "ThemeNotFound" } as const satisfies ThemeManagerError,

	systemThemeUnassigned(systemTheme: SystemTheme): ThemeManagerError {
		return { type: "SystemThemeUnassigned", systemTheme };
	},

	systemThemesDisabled: { type: "SystemThemesDisabled" } as const satisfies ThemeManagerError,
};

export function getErrorMessage(error: ThemeManagerError): string {
	switch (error.type) {
		case "NoThemes":
			return "At least one theme is required.";

		case "ThemeNotFound":
			return "Theme not found.";

		case "SystemThemeUnassigned":
			return `System theme '${error.systemTheme}' has no valid assigned theme.`;

		case "SystemThemesDisabled":
			return "System themes are disabled";
	}
}
