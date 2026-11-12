import { err, ok, type Result } from "neverthrow";
import { getContext, hasContext, setContext } from "svelte";
import type { ThemeRecord } from "$lib/core/theme/theme.js";
import { ThemeManagerError } from "$lib/core/theme-manager/errors.js";
import type { ThemeManager } from "$lib/core/theme-manager/theme-manager.js";

export const THEME_MANAGER_CONTEXT_SYMBOL = Symbol.for("__sv-themes_theme-manager-context__");

export function isThemeManagerRegistered(): boolean {
	return hasContext(THEME_MANAGER_CONTEXT_SYMBOL);
}

export function getThemeManager<const Themes extends ThemeRecord = ThemeRecord>(): ThemeManager<Themes> {
	if (!isThemeManagerRegistered()) throw new Error(ThemeManagerError.notRegistered.message);

	return getContext(THEME_MANAGER_CONTEXT_SYMBOL);
}

export function setThemeManager<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
): Result<void, ThemeManagerError> {
	if (isThemeManagerRegistered()) return err(ThemeManagerError.alreadyRegistered);

	setContext(THEME_MANAGER_CONTEXT_SYMBOL, themeManager);

	return ok();
}
