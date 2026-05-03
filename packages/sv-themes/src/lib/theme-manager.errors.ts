import type { SystemTheme } from "./theme-manager.svelte.ts";

export type ThemeManagerError =
	| { type: "NoThemes" }
	| { type: "DuplicateTheme"; theme: string }
	| { type: "ThemeNotFound" }
	| { type: "ThemeCssSrcInvalid"; src: string }
	| { type: "SystemThemeUnassigned"; systemTheme: SystemTheme }
	| { type: "SystemThemesDisabled" }
	| { type: "SystemThemeInvalidType"; systemTheme: SystemTheme };

export const ThemeManagerError = {
	noThemes: { type: "NoThemes" } as const satisfies ThemeManagerError,

	duplicateTheme(theme: string): ThemeManagerError {
		return { type: "DuplicateTheme", theme };
	},

	themeNotFound: { type: "ThemeNotFound" } as const satisfies ThemeManagerError,

	themeCssSrcInvalid(src: string): ThemeManagerError {
		return { type: "ThemeCssSrcInvalid", src };
	},

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

		case "DuplicateTheme":
			return `Duplicate theme: ${error.theme}`;

		case "ThemeNotFound":
			return "Theme not found.";

		case "ThemeCssSrcInvalid":
			return `Theme CSS src is invalid: ${error.src}`;

		case "SystemThemeUnassigned":
			return `System theme '${error.systemTheme}' has no valid assigned theme.`;

		case "SystemThemesDisabled":
			return "System themes are disabled";

		case "SystemThemeInvalidType":
			return `System theme '${error.systemTheme}' needs to be assigned to a theme with type '${error.systemTheme}'.`;
	}
}
