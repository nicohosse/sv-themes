import type { StorageMethod, StorageOptions, ThemeAttribute, ThemeManager, ThemeRecord } from "$lib/index.js";
import { STORAGE_METHOD_PRIORITY, type SystemThemes } from "./theme-manager/index.js";

export type ThemeScriptArguments<Themes extends ThemeRecord = ThemeRecord> = Pick<
	ThemeManager<Themes>,
	| "themes"
	| "themeIds"
	| "systemThemes"
	| "useSystemTheme"
	| "initialTheme"
	| "selectedTheme"
	| "forcedTheme"
	| "useColorScheme"
	| "useThemeColor"
	| "isThemeForcedAttribute"
	| "isSystemThemeAttribute"
	| "storage"
	| "attributes"
>;

export function themeScript<const Themes extends ThemeRecord>(
	themes: Themes,
	themeIds: string[],
	systemThemes: SystemThemes<Themes>,
	useSystemTheme: boolean,
	initialTheme: string,
	selectedTheme: string,
	attributes: ThemeAttribute[],
	storageMethodPriority: Record<StorageMethod, number>,
	forcedTheme?: string,
	useColorScheme?: boolean,
	useThemeColor?: boolean,
	isThemeForcedAttribute?: string,
	isSystemThemeAttribute?: string,
	storage?: StorageOptions,
) {
	const rootElement = document.documentElement;

	const getPersistedTheme = (): string | undefined => {
		if (!storage) return undefined;

		const persistedThemes: Map<StorageMethod, string> = new Map();

		const sortedStorageMethods = storage?.methods?.toSorted(
			(a, b) => storageMethodPriority[b] - storageMethodPriority[a],
		);

		let dominantTheme: string | undefined;

		for (const storageMethod of sortedStorageMethods) {
			let storedTheme: string | null = null;

			if (storageMethod === "localStorage") storedTheme = localStorage.getItem(storage.key);
			else if (storageMethod === "sessionStorage") storedTheme = sessionStorage.getItem(storage.key);
			else if (storageMethod === "cookie") {
				const match = document.cookie.match(new RegExp(`(^|;\\s*)${encodeURIComponent(storage.key)}=([^;]*)`));
				storedTheme = match && decodeURIComponent(match[2]);
			}

			if (!storedTheme) continue;

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme ??= storedTheme;
		}

		return dominantTheme && (dominantTheme === "system" || themeIds.includes(dominantTheme))
			? dominantTheme
			: undefined;
	};

	const resolveSystemTheme = () => {
		if (systemThemes.kind === "disabled") return;

		const isDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
		return isDark ? systemThemes.mappings.dark : systemThemes.mappings.light;
	};

	const persistedTheme = getPersistedTheme();

	const resolvedUseSystemTheme =
		(useSystemTheme || (forcedTheme ?? persistedTheme) === "system") && systemThemes.kind === "enabled";

	const resolvedTheme =
		themes[
			(resolvedUseSystemTheme ? resolveSystemTheme() : (forcedTheme ?? persistedTheme ?? selectedTheme)) ?? initialTheme
		];

	const allThemeClasses = themeIds.map((id) => themes[id].className ?? id);

	for (const attribute of attributes)
		if (attribute === "class") {
			rootElement.classList.remove(...allThemeClasses);
			rootElement.classList.add(resolvedTheme.className ?? resolvedTheme.id);
		} else rootElement.setAttribute(attribute, resolvedTheme.id);

	if (useColorScheme) {
		rootElement.style.colorScheme = resolvedTheme.type;

		let colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

		if (!colorSchemeMetaElement) {
			colorSchemeMetaElement = document.createElement("meta");
			colorSchemeMetaElement.name = "color-scheme";
			document.head.appendChild(colorSchemeMetaElement);
		}

		const firstThemeId = themeIds.at(0);

		if (firstThemeId) {
			const themeValues = Object.values(themes);
			const hasLightTheme = !!themeValues.find((theme) => theme.type === "light");
			const hasDarkTheme = !!themeValues.find((theme) => theme.type === "dark");

			const firstThemeType = themes[firstThemeId].type;

			let colorSchemeContent = "light";

			if (firstThemeType === "light" && hasDarkTheme) colorSchemeContent = "light dark";
			else if (firstThemeType === "dark" && hasLightTheme) colorSchemeContent = "dark light";
			else if (!hasLightTheme && hasDarkTheme) colorSchemeContent = "dark";

			colorSchemeMetaElement.content = colorSchemeContent;
		}
	}

	if (useThemeColor && resolvedTheme.color) {
		let themeColorMetaElement = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

		if (!themeColorMetaElement) {
			themeColorMetaElement = document.createElement("meta");
			themeColorMetaElement.name = "theme-color";
			document.head.appendChild(themeColorMetaElement);
		}

		themeColorMetaElement.setAttribute("content", resolvedTheme.color);
	}

	if (isThemeForcedAttribute)
		if (forcedTheme) rootElement.setAttribute(isThemeForcedAttribute, "true");
		else rootElement.removeAttribute(isThemeForcedAttribute);

	if (isSystemThemeAttribute)
		if (useSystemTheme) rootElement.setAttribute(isSystemThemeAttribute, "true");
		else rootElement.removeAttribute(isSystemThemeAttribute);

	if (document.currentScript) document.currentScript.remove();
}

const NAME_MINIFICATION_REGEX = /\s*__name\([^;]*\);?/g;

export function getThemeScript<const Themes extends ThemeRecord>(config: Readonly<ThemeScriptArguments<Themes>>) {
	const fn = themeScript.toString().replace(NAME_MINIFICATION_REGEX, "");

	const args = [
		config.themes,
		config.themeIds,
		config.systemThemes,
		config.useSystemTheme,
		config.initialTheme,
		config.selectedTheme,
		config.attributes,
		STORAGE_METHOD_PRIORITY,
		config.forcedTheme,
		config.useColorScheme,
		config.useThemeColor,
		config.isThemeForcedAttribute,
		config.isSystemThemeAttribute,
		config.storage,
	]
		.map((argument) => (argument === undefined ? "undefined" : safeSerializeArgument(argument)))
		.join(",");

	return `(${fn})(${args})`;
}

export function safeSerializeArgument(argument: unknown): string {
	const json = JSON.stringify(argument);

	return json
		.replace(/<\/script\s*>/gi, "<\\/script>")
		.replace(/<\s*\/\s*script\s*>/gi, "<\\/script>")
		.replace(/<!--/g, "<\\!--")
		.replace(/<\/([a-zA-Z][a-zA-Z0-9-]*)>/g, "<\\$1>");
}
