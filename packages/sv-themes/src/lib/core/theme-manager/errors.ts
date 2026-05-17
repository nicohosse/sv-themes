import type { BaseError } from "../errors.js";
import type { SystemTheme } from "./theme-manager.js";

export type ThemeManagerError = BaseError &
	(
		| { type: "NoThemes" }
		| { type: "DuplicateTheme"; theme: string }
		| { type: "ThemeNotFound"; theme: string }
		| { type: "ThemeInvalidId"; id: string }
		| { type: "SystemThemeUnassigned"; systemTheme: SystemTheme }
		| { type: "SystemThemesDisabled" }
		| { type: "SystemThemeInvalidType"; systemTheme: SystemTheme }
		| { type: "ForcedThemeLocked" }
		| { type: "TabSyncStorageMethodsIncompatible" }
		| { type: "Cancelled" }
	);

export const ThemeManagerError = {
	noThemes: {
		type: "NoThemes",
		message: "At least one theme is required.",
	} as const satisfies ThemeManagerError,

	duplicateTheme(theme: string): ThemeManagerError {
		return {
			type: "DuplicateTheme",
			theme,
			message: `Duplicate theme: ${theme}`,
		};
	},

	themeNotFound(theme: string): ThemeManagerError {
		return {
			type: "ThemeNotFound",
			theme,
			message: `Theme '${theme}' not found.`,
		};
	},

	themeInvalidId(id: string): ThemeManagerError {
		return {
			type: "ThemeInvalidId",
			id,
			message: `Theme id '${id}' is invalid. The id 'system' is reserved.`,
		};
	},

	systemThemeUnassigned(systemTheme: SystemTheme): ThemeManagerError {
		return {
			type: "SystemThemeUnassigned",
			systemTheme,
			message: `System theme '${systemTheme}' has no valid assigned theme.`,
		};
	},

	systemThemesDisabled: {
		type: "SystemThemesDisabled",
		message: "System themes are disabled.",
	} as const satisfies ThemeManagerError,

	systemThemeInvalidType(systemTheme: SystemTheme): ThemeManagerError {
		return {
			type: "SystemThemeInvalidType",
			systemTheme,
			message: `System theme '${systemTheme}' needs to be assigned to a theme with type '${systemTheme}'.`,
		};
	},

	forcedThemeLocked: {
		type: "ForcedThemeLocked",
		message: "Forced theme is locked.",
	} as const satisfies ThemeManagerError,

	tabSyncStorageMethodsIncompatible: {
		type: "TabSyncStorageMethodsIncompatible",
		message: "Tab sync requires at least one of the following storage methods: localStorage, sessionStorage",
	} as const satisfies ThemeManagerError,

	cancelled: {
		type: "Cancelled",
		message: "The operation has been cancelled.",
	} as const satisfies ThemeManagerError,
} as const;
