import type { ThemeManager, ThemeRecord } from "$lib/index.js";

export const HTML_TAG_REGEX = /<html([^>]*)>/;
export const HEAD_CLOSE_REGEX = /<\/head>/;

export const CLASS_ATTRIBUTE_REGEX = /class=["']([^"']*)["']/;
export const STYLE_ATTRIBUTE_REGEX = /style=["']([^"']*)["']/;

export const FORCED_THEME_META_REGEX =
	/<meta\b[^>]*\bname=["']sv-themes-force-theme["'][^>]*\bcontent=["']forcedTheme=(?<forcedTheme>[^;]+);priority=(?<priority>[^;]+);overrideChildren=(?<overrideChildren>[^"']+)["'][^>]*>/gi;

export function getSSRAttributes<Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
	const attributes: Record<string, string> = {};

	for (const attribute of themeManager.attributes) {
		const value = attribute === "class" && resolvedTheme.className ? resolvedTheme.className : resolvedTheme.id;
		attributes[attribute] = value;
	}

	if (themeManager.isThemeForcedAttribute && themeManager.forcedTheme)
		attributes[themeManager.isThemeForcedAttribute] = "true";

	if (themeManager.isSystemThemeAttribute && themeManager.resolvedUseSystemTheme)
		attributes[themeManager.isSystemThemeAttribute] = "true";

	if (themeManager.useColorScheme) attributes.style = `color-scheme: ${resolvedTheme.type};`;

	return attributes;
}

function normalizeForcedTheme(value?: string) {
	if (!value) return undefined;
	if (value === "undefined") return undefined;
	if (value === "null") return undefined;
	return value;
}

export function resolveForcedTheme(html: string) {
	const forcedThemeMatches = html.matchAll(FORCED_THEME_META_REGEX).toArray();

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
