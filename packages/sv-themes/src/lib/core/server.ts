import type { ThemeManager, ThemeRecord } from "$lib/index.js";

export const HTML_TAG_REGEX = /<html([^>]*)>/;
export const HEAD_CLOSE_REGEX = /<\/head>/;

export const CLASS_ATTRIBUTE_REGEX = /class=["']([^"']*)["']/;
export const STYLE_ATTRIBUTE_REGEX = /style=["']([^"']*)["']/;

export const FORCE_THEME_META_REGEX =
	/<meta\b[^>]*\bname=["']sv-themes-force-theme["'][^>]*\bcontent=["']forcedTheme=(?<forcedTheme>[^;]+);priority=(?<priority>[^;]+);overrideChildren=(?<overrideChildren>[^"']+)["'][^>]*>/gi;

export function getSSRAttributes<Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
	const attributes: Record<string, string> = {};

	for (const attribute of themeManager.attributes) attributes[attribute] = resolvedTheme.className ?? resolvedTheme.id;

	if (themeManager.isThemeForcedAttribute && themeManager.forcedTheme)
		attributes[themeManager.isThemeForcedAttribute] = "true";

	if (themeManager.isSystemThemeAttribute && themeManager.resolvedUseSystemTheme)
		attributes[themeManager.isSystemThemeAttribute] = "true";

	if (themeManager.useColorScheme) attributes.style = `color-scheme: ${resolvedTheme.type};`;

	return attributes;
}

export function getSSRTags<Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>): string[] {
	const tags: string[] = [];

	if (themeManager.useColorScheme) {
		const firstTheme = Object.values(themeManager.themes)[0];

		let colorSchemeContent = "light";

		if (firstTheme.type === "light" && themeManager.hasDarkTheme) colorSchemeContent = "light dark";
		else if (firstTheme.type === "dark" && themeManager.hasLightTheme) colorSchemeContent = "dark light";
		else if (!themeManager.hasLightTheme && themeManager.hasDarkTheme) colorSchemeContent = "dark";

		tags.push(`<meta name="color-scheme" content="${colorSchemeContent}">`);
	}

	if (themeManager.useThemeColor) {
		const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
		if (!resolvedTheme.color) return tags;

		const isColorHex = resolvedTheme.color.startsWith("#");
		if (!isColorHex) return tags;

		tags.push(`<meta name="theme-color" content="${resolvedTheme.color}">`);
	}

	return tags;
}

export function normalizeForcedTheme(value?: string) {
	if (!value) return undefined;
	if (value === "undefined") return undefined;
	if (value === "null") return undefined;
	return value;
}

export function resolveForcedTheme(html: string) {
	const forcedThemeMatches = html.matchAll(FORCE_THEME_META_REGEX).toArray();

	const forcedThemeRequests = forcedThemeMatches.map((match) => ({
		forcedTheme: match.groups?.forcedTheme,
		priority: parseInt(match.groups?.priority ?? "0", 10),
		overrideChildren: match.groups?.overrideChildren === "true",
	}));

	let forcedTheme: string | undefined;
	let currentPriority = -Infinity;
	let isLocked = false;

	for (const request of forcedThemeRequests) {
		if (isLocked) break;

		if (request.overrideChildren) {
			forcedTheme = normalizeForcedTheme(request.forcedTheme);
			isLocked = true;
			break;
		}

		if (request.priority >= currentPriority) {
			forcedTheme = normalizeForcedTheme(request.forcedTheme);
			currentPriority = request.priority;
		}
	}

	return forcedTheme;
}
