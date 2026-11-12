import type { ThemeRecord } from "./theme/theme.js";
import type {
	StorageOptions,
	SystemTheme,
	SystemThemes,
	ThemeAttribute,
	ThemeManager,
} from "./themeManager/themeManager.js";

export const HTML_TAG_REGEX = /<html([^>]*)>/i;
export const HEAD_CLOSE_REGEX = /<\/head\s*>/i;

export const CLASS_ATTRIBUTE_REGEX = /class=["']([^"']*)["']/i;
export const STYLE_ATTRIBUTE_REGEX = /style=["']([^"']*)["']/i;

export const FORCE_THEME_META_REGEX = /<meta\b[^>]*\bname=["']sv-themes-force-theme["'][^>]*>/gi;
const CONTENT_ATTRIBUTE_REGEX = /\bcontent=["']([^"']*)["']/i;

/**
 * A request-scoped, immutable view of a theme manager.
 *
 * The SvelteKit handle resolves persistence and forced themes into this snapshot
 * instead of mutating the (possibly module-global) manager. This is what makes SSR
 * safe across concurrent requests.
 */
export interface ThemeManagerSnapshot<Themes extends ThemeRecord = ThemeRecord> {
	readonly themes: Themes;
	readonly themeIds: (keyof Themes)[];
	readonly systemThemes: SystemThemes<Themes>;
	readonly useSystemTheme: boolean;
	readonly resolvedUseSystemTheme: boolean;
	readonly hasLightTheme: boolean;
	readonly hasDarkTheme: boolean;
	readonly initialTheme: keyof Themes;
	readonly resolvedTheme: keyof Themes;
	readonly selectedTheme: keyof Themes;
	readonly forcedTheme?: keyof Themes | "system";
	readonly useColorScheme: boolean;
	readonly useThemeColor: boolean;
	readonly useFavicon: boolean;
	readonly isThemeForcedAttribute?: string;
	readonly isSystemThemeAttribute?: string;
	readonly storage?: StorageOptions;
	readonly attributes: ThemeAttribute[];
}

export interface ThemeManagerSnapshotOptions<Themes extends ThemeRecord> {
	persistedTheme?: string;
	forcedTheme?: keyof Themes | "system";
	systemTheme?: SystemTheme;
}

/**
 * Resolves the effective theme state for a single SSR request.
 */
export function createThemeSnapshot<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	options: ThemeManagerSnapshotOptions<Themes> = {},
): ThemeManagerSnapshot<Themes> {
	const { persistedTheme, forcedTheme, systemTheme = "light" } = options;

	const persistedConcreteTheme =
		persistedTheme && persistedTheme !== "system" && persistedTheme in themeManager.themes
			? (persistedTheme as keyof Themes)
			: undefined;

	const useSystemTheme =
		persistedTheme === "system" ? true : persistedConcreteTheme ? false : themeManager.useSystemTheme;
	const selectedTheme = persistedConcreteTheme ?? themeManager.selectedTheme;

	const resolvedUseSystemTheme =
		themeManager.systemThemes.kind === "enabled" && ((!forcedTheme && useSystemTheme) || forcedTheme === "system");

	const resolvedTheme =
		resolvedUseSystemTheme && themeManager.systemThemes.kind === "enabled"
			? themeManager.systemThemes.mappings[systemTheme]
			: (((forcedTheme === "system" ? undefined : forcedTheme) ?? selectedTheme) as keyof Themes);

	return {
		themes: themeManager.themes,
		themeIds: themeManager.themeIds,
		systemThemes: themeManager.systemThemes,
		useSystemTheme,
		resolvedUseSystemTheme,
		hasLightTheme: themeManager.hasLightTheme,
		hasDarkTheme: themeManager.hasDarkTheme,
		initialTheme: themeManager.initialTheme,
		resolvedTheme,
		selectedTheme,
		forcedTheme,
		useColorScheme: themeManager.useColorScheme,
		useThemeColor: themeManager.useThemeColor,
		useFavicon: themeManager.useFavicon,
		isThemeForcedAttribute: themeManager.isThemeForcedAttribute,
		isSystemThemeAttribute: themeManager.isSystemThemeAttribute,
		storage: themeManager.storage,
		attributes: themeManager.attributes,
	};
}

export function escapeAttribute(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getSSRAttributes<const Themes extends ThemeRecord>(
	themeManager: ThemeManagerSnapshot<Themes> | ThemeManager<Themes>,
): Record<string, string> {
	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
	const attributes: Record<string, string> = {};

	for (const attribute of themeManager.attributes)
		attributes[attribute] = attribute === "class" ? (resolvedTheme.className ?? resolvedTheme.id) : resolvedTheme.id;

	if (themeManager.isThemeForcedAttribute && themeManager.forcedTheme)
		attributes[themeManager.isThemeForcedAttribute] = "true";

	if (themeManager.isSystemThemeAttribute && themeManager.resolvedUseSystemTheme)
		attributes[themeManager.isSystemThemeAttribute] = "true";

	// color-scheme is serialized separately by the handle so it can be merged with
	// any existing inline style instead of replacing it.
	if (themeManager.useColorScheme) attributes.style = `color-scheme: ${resolvedTheme.type};`;

	return attributes;
}

export function getSSRTags<const Themes extends ThemeRecord>(
	themeManager: ThemeManagerSnapshot<Themes> | ThemeManager<Themes>,
): string[] {
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

		if (resolvedTheme.color?.startsWith("#"))
			tags.push(`<meta name="theme-color" content="${escapeAttribute(resolvedTheme.color)}">`);
	}

	if (themeManager.useFavicon) {
		const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

		if (resolvedTheme.favicon) tags.push(`<link rel="icon" href="${escapeAttribute(resolvedTheme.favicon)}">`);
	}

	return tags;
}

export function normalizeForcedTheme(value?: string | null) {
	if (!value) return undefined;
	if (value === "undefined") return undefined;
	if (value === "null") return undefined;
	return value;
}

interface ResolvedForcedThemeRequest {
	forcedTheme?: string;
	priority: number;
	overrideChildren: boolean;
	depth?: number;
	index: number;
	parent?: ResolvedForcedThemeRequest;
}

function parseForcedThemeContent(content: string): Omit<ResolvedForcedThemeRequest, "index"> | undefined {
	const decoded = (() => {
		try {
			return decodeURIComponent(content);
		} catch {
			return content;
		}
	})();

	try {
		const parsed: unknown = JSON.parse(decoded);

		if (typeof parsed !== "object" || parsed === null) return undefined;

		const record = parsed as Record<string, unknown>;

		const forcedTheme = typeof record.forcedTheme === "string" ? normalizeForcedTheme(record.forcedTheme) : undefined;

		const priority = typeof record.priority === "number" && Number.isFinite(record.priority) ? record.priority : 0;
		const overrideChildren = record.overrideChildren === true;
		const depth = typeof record.depth === "number" && Number.isFinite(record.depth) ? record.depth : undefined;

		return { forcedTheme, priority, overrideChildren, depth };
	} catch {
		// Legacy format: forcedTheme=dark;priority=0;overrideChildren=false
		const fields = Object.fromEntries(
			decoded
				.split(";")
				.map((field) => field.split("="))
				.filter((entry) => entry.length >= 2)
				.map(([key, ...rest]) => [key, rest.join("=")]),
		);

		if (!("forcedTheme" in fields)) return undefined;

		return {
			forcedTheme: normalizeForcedTheme(fields.forcedTheme),
			priority: Number.parseInt(fields.priority ?? "0", 10) || 0,
			overrideChildren: fields.overrideChildren === "true",
		};
	}
}

function isBlockedByAncestor(request: ResolvedForcedThemeRequest): boolean {
	let current = request.parent;

	while (current) {
		if (current.overrideChildren) return true;
		current = current.parent;
	}

	return false;
}

/**
 * Resolves the dominant forced theme from rendered meta tags.
 *
 * Requests are reconstructed as a tree using document order and `depth`. A request
 * blocked by an ancestor with `overrideChildren` is discarded, then remaining
 * requests compete by highest priority and, for ties, latest document position.
 * This matches the client-side force-theme registry semantics.
 */
export function resolveForcedTheme(html: string) {
	const requests: ResolvedForcedThemeRequest[] = [];
	const stack: ResolvedForcedThemeRequest[] = [];

	for (const [index, match] of [...html.matchAll(FORCE_THEME_META_REGEX)].entries()) {
		const content = CONTENT_ATTRIBUTE_REGEX.exec(match[0])?.[1];

		if (content === undefined) continue;

		const parsed = parseForcedThemeContent(content);

		if (!parsed) continue;

		const request: ResolvedForcedThemeRequest = { ...parsed, index };

		if (request.depth !== undefined) {
			while (stack.length > 0 && (stack[stack.length - 1].depth ?? 0) >= request.depth) stack.pop();

			request.parent = stack[stack.length - 1];
			stack.push(request);
		}

		requests.push(request);
	}

	const validRequests = requests.filter((request) => !isBlockedByAncestor(request));

	if (validRequests.length === 0) return undefined;

	validRequests.sort((a, b) => b.priority - a.priority || b.index - a.index);

	return normalizeForcedTheme(validRequests[0].forcedTheme);
}
