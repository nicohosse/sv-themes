// v8 ignore file

import type { BaseError } from "../errors.js";
import type { SystemTheme } from "./theme-manager.js";

export type ThemeManagerError = BaseError & { namespace: "ThemeManager" } & (
		| { id: "ThemeNotFound"; theme: string }
		| { id: "SystemThemeUnassigned"; systemTheme: SystemTheme }
		| { id: "SystemThemesDisabled" }
		| { id: "SystemThemeInvalidType"; systemTheme: SystemTheme }
		| { id: "ForcedThemeLocked" }
		| { id: "TabSyncStorageMethodsIncompatible" }
		| { id: "Cancelled" }
	);

export const ThemeManagerError = {
	themeNotFound(theme: string): ThemeManagerError {
		return {
			namespace: "ThemeManager",
			id: "ThemeNotFound",
			theme,
			message: `Theme '${theme}' not found.`,
		};
	},

	systemThemeUnassigned(systemTheme: SystemTheme): ThemeManagerError {
		return {
			namespace: "ThemeManager",
			id: "SystemThemeUnassigned",
			systemTheme,
			message: `System theme '${systemTheme}' has no valid assigned theme.`,
		};
	},

	systemThemesDisabled: {
		namespace: "ThemeManager",
		id: "SystemThemesDisabled",
		message: "System themes are disabled.",
	} as const satisfies ThemeManagerError,

	systemThemeInvalidType(systemTheme: SystemTheme): ThemeManagerError {
		return {
			namespace: "ThemeManager",
			id: "SystemThemeInvalidType",
			systemTheme,
			message: `System theme '${systemTheme}' needs to be assigned to a theme with type '${systemTheme}'.`,
		};
	},

	forcedThemeLocked: {
		namespace: "ThemeManager",
		id: "ForcedThemeLocked",
		message: "Forced theme is locked.",
	} as const satisfies ThemeManagerError,

	tabSyncStorageMethodsIncompatible: {
		namespace: "ThemeManager",
		id: "TabSyncStorageMethodsIncompatible",
		message: "Tab sync requires at least one of the following storage methods: localStorage, sessionStorage",
	} as const satisfies ThemeManagerError,

	cancelled: {
		namespace: "ThemeManager",
		id: "Cancelled",
		message: "The operation has been cancelled.",
	} as const satisfies ThemeManagerError,
} as const;
