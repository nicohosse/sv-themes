// v8 ignore file

import type { ThemeError, ThemeManagerError } from "$lib/index.js";

export type BaseError = {
	message: string;
};

export type LibError = ThemeManagerError | ThemeError;
