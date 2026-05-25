// v8 ignore file

import type { BaseError } from "../errors.js";

export type ThemeError = BaseError & { namespace: "Theme" } & (
		| { id: "NoThemes" }
		| { id: "DuplicateTheme"; theme: string }
		| { id: "InvalidId"; theme: string }
	);

export const ThemeError = {
	noThemes: {
		namespace: "Theme",
		id: "NoThemes",
		message: "At least one theme is required.",
	} as const satisfies ThemeError,

	duplicateTheme(theme: string): ThemeError {
		return { namespace: "Theme", id: "DuplicateTheme", theme, message: `Duplicate theme: ${theme}` };
	},

	invalidId(theme: string): ThemeError {
		return {
			namespace: "Theme",
			id: "InvalidId",
			theme,
			message: `Theme id '${theme}' is invalid. The id 'system' is reserved.`,
		};
	},
};
