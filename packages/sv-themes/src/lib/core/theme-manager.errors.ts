import type { SystemTheme } from "./theme-manager.svelte.js";

export type ThemeManagerError =
	| { type: "NoThemes" }
	| { type: "DuplicateTheme"; theme: string }
	| { type: "ThemeNotFound"; theme: string }
	| { type: "ThemeInvalidCssSrc"; src: string }
	| { type: "ThemeInvalidId"; id: string }
	| { type: "SystemThemeUnassigned"; systemTheme: SystemTheme }
	| { type: "SystemThemesDisabled" }
	| { type: "SystemThemeInvalidType"; systemTheme: SystemTheme }
	| { type: "Cancelled" };

export const ThemeManagerError = {
	noThemes: { type: "NoThemes" } as const satisfies ThemeManagerError,

	duplicateTheme(theme: string): ThemeManagerError {
		return { type: "DuplicateTheme", theme };
	},

	themeNotFound(theme: string): ThemeManagerError {
		return { type: "ThemeNotFound", theme };
	},

	themeInvalidCssSrc(src: string): ThemeManagerError {
		return { type: "ThemeInvalidCssSrc", src };
	},

	themeInvalidId(id: string): ThemeManagerError {
		return { type: "ThemeInvalidId", id };
	},

	systemThemeUnassigned(systemTheme: SystemTheme): ThemeManagerError {
		return { type: "SystemThemeUnassigned", systemTheme };
	},

	systemThemesDisabled: { type: "SystemThemesDisabled" } as const satisfies ThemeManagerError,

	systemThemeInvalidType(systemTheme: SystemTheme): ThemeManagerError {
		return { type: "SystemThemeInvalidType", systemTheme };
	},

	cancelled: { type: "Cancelled" } as const satisfies ThemeManagerError,
};

export function getErrorMessage(error: ThemeManagerError): string {
	switch (error.type) {
		case "NoThemes":
			return "At least one theme is required.";

		case "DuplicateTheme":
			return `Duplicate theme: ${error.theme}`;

		case "ThemeNotFound":
			return `Theme '${error.theme}' not found.`;

		case "ThemeInvalidCssSrc":
			return `Theme CSS src is invalid: ${error.src}`;

		case "ThemeInvalidId":
			return `Theme id '${error.id}' is invalid. The id 'system' is reserved.`;

		case "SystemThemeUnassigned":
			return `System theme '${error.systemTheme}' has no valid assigned theme.`;

		case "SystemThemesDisabled":
			return "System themes are disabled.";

		case "SystemThemeInvalidType":
			return `System theme '${error.systemTheme}' needs to be assigned to a theme with type '${error.systemTheme}'.`;

		case "Cancelled":
			return "The operation has been cancelled.";
	}
}
