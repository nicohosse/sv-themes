import type { ThemeManagerError } from "./themeManager/errors.js";

export type BaseError = {
	message: string;
};

export type LibError = ThemeManagerError;
