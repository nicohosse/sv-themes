import { err, ok, type Result } from "neverthrow";
import type { SystemTheme, ThemeRecord } from "$lib/index.js";
import { ThemeManagerError } from "./errors.js";
import type { ResolvedThemeManagerConfig } from "./resolver.js";

export function validateRequestedTheme<const Themes extends ThemeRecord>(
	themes: Themes,
	requestedTheme: keyof Themes,
): Result<void, ThemeManagerError> {
	if (!(requestedTheme in themes)) return err(ThemeManagerError.themeNotFound(requestedTheme.toString()));

	return ok();
}

export function validateSystemTheme<const Themes extends ThemeRecord>(
	config: ResolvedThemeManagerConfig<Themes>,
	systemTheme: SystemTheme,
): Result<void, ThemeManagerError> {
	if (config.systemThemes.kind === "disabled") return err(ThemeManagerError.systemThemesDisabled);

	const resolvedSystemThemeId = config.systemThemes.mappings[systemTheme];
	const hasSystemTheme = resolvedSystemThemeId && resolvedSystemThemeId in config.themes;

	if (hasSystemTheme && config.themes[resolvedSystemThemeId].type !== systemTheme)
		return err(ThemeManagerError.systemThemeInvalidType(systemTheme));
	else if (!hasSystemTheme) return err(ThemeManagerError.systemThemeUnassigned(systemTheme));

	return ok();
}

export function validateThemeManagerConfig<const Themes extends ThemeRecord>(
	config: ResolvedThemeManagerConfig<Themes>,
): Result<void, ThemeManagerError[]> {
	const errors: ThemeManagerError[] = [];

	const selectedThemeResult = validateRequestedTheme(config.themes, config.initialTheme);
	if (selectedThemeResult.isErr()) errors.push(selectedThemeResult.error);

	if (config.systemThemes.kind === "enabled") {
		const lightThemeResult = validateSystemTheme(config, "light");
		if (lightThemeResult.isErr()) errors.push(lightThemeResult.error);

		const darkThemeResult = validateSystemTheme(config, "dark");
		if (darkThemeResult.isErr()) errors.push(darkThemeResult.error);
	} else if (config.systemThemes.kind === "disabled" && config.useSystemTheme)
		errors.push(ThemeManagerError.systemThemesDisabled);

	if (
		config.enableTabSync &&
		!(config.storage?.methods.includes("localStorage") || config.storage?.methods.includes("sessionStorage"))
	)
		errors.push(ThemeManagerError.tabSyncStorageMethodsIncompatible);

	if (errors.length > 0) return err(errors);

	return ok();
}
