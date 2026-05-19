import type { BaseError } from "../errors.js";

export type ThemeError = BaseError & ({ id: "NoThemes" } | { id: "DuplicateTheme"; theme: string });

export const ThemeError = {
	noThemes: { id: "NoThemes", message: "At least one theme is required." } as const satisfies ThemeError,

	duplicateTheme(theme: string): ThemeError {
		return { id: "DuplicateTheme", theme, message: `Duplicate theme: ${theme}` };
	},
};
