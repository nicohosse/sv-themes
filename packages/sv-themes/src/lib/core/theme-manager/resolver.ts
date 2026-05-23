import { err, ok, type Result } from "neverthrow";
import { type SystemTheme, ThemeManagerError, type ThemeRecord } from "$lib/index.js";
import type { ThemeManagerConfig } from "./create-theme-manager.svelte.js";
import { DEFAULT_STORAGE_HYBRID, type SystemThemes } from "./theme-manager.js";

export type ResolvedSystemThemesConfig<Themes extends ThemeRecord> =
	SystemThemes<Themes> extends infer T
		? T extends { kind: "enabled" }
			? {
					kind: "enabled";
					mappings: Record<SystemTheme, keyof Themes>;
				}
			: T
		: never;

export type ResolvedThemeManagerConfig<Themes extends ThemeRecord> = Omit<
	ThemeManagerConfig<Themes>,
	"systemThemes" | "attributes"
> & {
	systemThemes: ResolvedSystemThemesConfig<Themes>;
} & Required<Pick<ThemeManagerConfig<Themes>, "attributes">>;

export function resolveSystemThemes<Themes extends ThemeRecord>(
	config: ThemeManagerConfig<Themes>,
): Result<ResolvedSystemThemesConfig<Themes>, ThemeManagerError> {
	const systemThemes = config.systemThemes ?? { kind: "disabled" };

	if (systemThemes.kind === "disabled") return ok(systemThemes);

	const themeValues = Object.values(config.themes);

	const lightSystemTheme = systemThemes.mappings?.light ?? themeValues.find((theme) => theme.type === "light")?.id;
	const darkSystemTheme = systemThemes.mappings?.dark ?? themeValues.find((theme) => theme.type === "dark")?.id;

	if (!lightSystemTheme || !(lightSystemTheme in config.themes))
		return err(ThemeManagerError.systemThemeUnassigned("light"));

	if (!darkSystemTheme || !(darkSystemTheme in config.themes))
		return err(ThemeManagerError.systemThemeUnassigned("dark"));

	return ok({
		kind: "enabled",
		mappings: {
			light: lightSystemTheme,
			dark: darkSystemTheme,
		},
	});
}

export function resolveThemeManagerConfig<const Themes extends ThemeRecord>(
	config: ThemeManagerConfig<Themes>,
): Result<ResolvedThemeManagerConfig<Themes>, ThemeManagerError> {
	const resolvedSystemThemeResult = resolveSystemThemes(config);
	if (resolvedSystemThemeResult.isErr()) return err(resolvedSystemThemeResult.error);

	return ok({
		themes: config.themes,
		systemThemes: resolvedSystemThemeResult.value,
		useSystemTheme: config.useSystemTheme,
		initialTheme: config.initialTheme,
		forcedTheme: config.forcedTheme,
		isForcedThemeLocked: config.isForcedThemeLocked,
		useColorScheme: config.useColorScheme ?? true,
		useThemeColor: config.useThemeColor ?? true,
		isThemeForcedAttribute: "isThemeForcedAttribute" in config ? config.isThemeForcedAttribute : "data-is-theme-forced",
		isSystemThemeAttribute: "isSystemThemeAttribute" in config ? config.isSystemThemeAttribute : "data-is-system-theme",
		storage: "storage" in config ? config.storage : DEFAULT_STORAGE_HYBRID,
		enableTabSync: config.enableTabSync ?? true,
		attributes: "attributes" in config ? (config.attributes ?? []) : ["class", "data-theme"],
	} satisfies ResolvedThemeManagerConfig<Themes>);
}
