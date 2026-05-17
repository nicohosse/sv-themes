import type { BaseError } from "../errors.js";

export type ThemeError = BaseError & ({ type: "NoThemes" } | { type: "DuplicateTheme"; theme: string });

export const ThemeError = {
	noThemes: { type: "NoThemes", message: "At least one theme is required." } as const satisfies ThemeError,

	duplicateTheme(theme: string): ThemeError {
		return { type: "DuplicateTheme", theme, message: `Duplicate theme: ${theme}` };
	},
};
