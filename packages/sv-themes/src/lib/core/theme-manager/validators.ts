import { err, ok, type Result } from "neverthrow";
import type { SystemTheme, ThemeRecord } from "$lib/index.js";
import { ThemeManagerError } from "./errors.js";
import type { ResolvedThemeManagerConfig } from "./resolver.js";

export function validateRequestedTheme<const Themes extends ThemeRecord>(
	config: ResolvedThemeManagerConfig<Themes>,
	requestedTheme: keyof Themes | "system",
): Result<void, ThemeManagerError> {
	if (requestedTheme === "system" && config.systemThemes.kind === "disabled")
		return err(ThemeManagerError.systemThemesDisabled);

	if (requestedTheme !== "system" && !(requestedTheme in config.themes))
		return err(ThemeManagerError.themeNotFound(requestedTheme.toString()));

	return ok();
}

export function validateSystemTheme<const Themes extends ThemeRecord>(
	config: ResolvedThemeManagerConfig<Themes>,
	systemTheme: SystemTheme,
): Result<void, ThemeManagerError> {
	if (config.systemThemes.kind === "disabled") return err(ThemeManagerError.systemThemesDisabled);

	const resolvedSystemThemeId = config.systemThemes.mappings?.[systemTheme];

	if (!resolvedSystemThemeId) return err(ThemeManagerError.systemThemeUnassigned(systemTheme));

	const hasSystemTheme = resolvedSystemThemeId && resolvedSystemThemeId in config.themes;

	if (hasSystemTheme && config.themes[resolvedSystemThemeId].type !== systemTheme)
		return err(ThemeManagerError.systemThemeInvalidType(systemTheme));
	else if (!hasSystemTheme) return err(ThemeManagerError.systemThemeUnassigned(systemTheme));

	return ok();
}

export function validateThemes<const Themes extends ThemeRecord>(
	config: ResolvedThemeManagerConfig<Themes>,
): Result<void, ThemeManagerError[]> {
	const seen = new Set<string>();
	const duplicates: string[] = [];

	const themes = Object.values(config.themes);

	for (const theme of themes)
		if (seen.has(theme.id)) duplicates.push(theme.id);
		else {
			seen.add(theme.id);
			if (theme.id === "system" || !theme.id.trim()) return err([ThemeManagerError.themeInvalidId(theme.id)]);
		}

	if (seen.size === 0) return err([ThemeManagerError.noThemes]);

	if (duplicates.length > 0)
		return err(duplicates.map((duplicateTheme) => ThemeManagerError.duplicateTheme(duplicateTheme)));

	return ok();
}

export function validateThemeManagerConfig<const Themes extends ThemeRecord>(
	config: ResolvedThemeManagerConfig<Themes>,
): Result<void, ThemeManagerError[]> {
	const errors: ThemeManagerError[] = [];

	const themesResult = validateThemes(config);
	if (themesResult.isErr()) errors.push(...themesResult.error);

	const selectedThemeResult = validateRequestedTheme(config, config.initialTheme);
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
