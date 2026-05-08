import type { ThemesRecord } from "./theme.js";
import type { ThemeManager } from "./theme-manager.svelte.js";

export function getSSRAttributes<Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
	const attributes: Record<string, string> = {};

	for (const attribute of themeManager.attributes) {
		const value = attribute === "class" && resolvedTheme.className ? resolvedTheme.className : resolvedTheme.id;
		attributes[attribute] = value;
	}

	if (themeManager.isThemeForcedAttribute && themeManager.forcedTheme)
		attributes[themeManager.isThemeForcedAttribute] = "true";

	if (themeManager.isSystemThemeAttribute && (themeManager.useSystemTheme || themeManager.forcedTheme === "system"))
		attributes[themeManager.isSystemThemeAttribute] = "true";

	if (themeManager.useColorScheme) attributes.style = `color-scheme: ${resolvedTheme.type};`;

	return attributes;
}
