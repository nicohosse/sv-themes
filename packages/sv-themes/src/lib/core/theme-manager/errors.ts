import type { BaseError } from "../index.js";
import type { SystemTheme } from "./theme-manager.js";

export type ThemeManagerError = BaseError &
	(
		| { id: "AlreadyRegistered" }
		| { id: "NotRegistered" }
		| { id: "ThemeNotFound"; theme: string }
		| { id: "NoThemes" }
		| { id: "DuplicateTheme"; theme: string }
		| { id: "InvalidId"; theme: string }
		| { id: "SystemThemeUnassigned"; systemTheme: SystemTheme }
		| { id: "SystemThemesDisabled" }
		| { id: "SystemThemeInvalidType"; systemTheme: SystemTheme }
		| { id: "ForcedThemeLocked" }
		| { id: "TabSyncStorageMethodsIncompatible" }
		| { id: "Cancelled" }
	);

export const ThemeManagerError = {
	alreadyRegistered: {
		id: "AlreadyRegistered",
		message: "A theme manager has already been registered.",
	} as const satisfies ThemeManagerError,

	notRegistered: {
		id: "NotRegistered",
		message: "No theme manager has been registered.",
	} as const satisfies ThemeManagerError,

	themeNotFound(theme: string): ThemeManagerError {
		return {
			id: "ThemeNotFound",
			theme,
			message: `Theme '${theme}' not found.`,
		};
	},

	noThemes: {
		id: "NoThemes",
		message: "At least one theme is required.",
	} as const satisfies ThemeManagerError,

	duplicateTheme(theme: string): ThemeManagerError {
		return { id: "DuplicateTheme", theme, message: `Duplicate theme: ${theme}` };
	},

	themeInvalidId(theme: string): ThemeManagerError {
		return {
			id: "InvalidId",
			theme,
			message: `Theme id '${theme}' is invalid. The id 'system' is reserved.`,
		};
	},

	systemThemeUnassigned(systemTheme: SystemTheme): ThemeManagerError {
		return {
			id: "SystemThemeUnassigned",
			systemTheme,
			message: `System theme '${systemTheme}' has no valid assigned theme.`,
		};
	},

	systemThemesDisabled: {
		id: "SystemThemesDisabled",
		message: "System themes are disabled.",
	} as const satisfies ThemeManagerError,

	systemThemeInvalidType(systemTheme: SystemTheme): ThemeManagerError {
		return {
			id: "SystemThemeInvalidType",
			systemTheme,
			message: `System theme '${systemTheme}' needs to be assigned to a theme with type '${systemTheme}'.`,
		};
	},

	forcedThemeLocked: {
		id: "ForcedThemeLocked",
		message: "Forced theme is locked.",
	} as const satisfies ThemeManagerError,

	tabSyncStorageMethodsIncompatible: {
		id: "TabSyncStorageMethodsIncompatible",
		message: "Tab sync requires at least one of the following storage methods: localStorage, sessionStorage",
	} as const satisfies ThemeManagerError,

	cancelled: {
		id: "Cancelled",
		message: "The operation has been cancelled.",
	} as const satisfies ThemeManagerError,
} as const;
