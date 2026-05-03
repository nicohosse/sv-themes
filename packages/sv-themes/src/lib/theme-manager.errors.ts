import type { SystemTheme } from "./theme-manager.svelte.ts";

export type ThemeManagerError =
	| { type: "NoThemes" }
	| { type: "ThemeNotFound" }
	| { type: "SystemThemeUnassigned"; systemTheme: SystemTheme }
	| { type: "SystemThemesDisabled" }
	| { type: "SystemThemeInvalidType"; systemTheme: SystemTheme };

export const ThemeManagerError = {
	noThemes: { type: "NoThemes" } as const satisfies ThemeManagerError,
	themeNotFound: { type: "ThemeNotFound" } as const satisfies ThemeManagerError,

	systemThemeUnassigned(systemTheme: SystemTheme): ThemeManagerError {
		return { type: "SystemThemeUnassigned", systemTheme };
	},

	systemThemesDisabled: { type: "SystemThemesDisabled" } as const satisfies ThemeManagerError,

	systemThemeInvalidType(systemTheme: SystemTheme): ThemeManagerError {
		return { type: "SystemThemeInvalidType", systemTheme };
	},
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

		case "SystemThemeInvalidType":
			return `System theme '${error.systemTheme}' needs to be assigned to a theme with type '${error.systemTheme}'.`;
	}
}
