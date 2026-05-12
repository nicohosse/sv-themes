import type { Theme, ThemeAttribute, ThemesRecord } from "./theme.js";
import {
	STORAGE_METHOD_PRIORITY,
	type StorageMethod,
	type StorageOptions,
	type SystemTheme,
} from "./theme-manager.svelte.js";

interface ThemeScriptArguments<Themes extends ThemesRecord> {
	themes: Themes;
	themeIds: (keyof Themes)[];

	resolvedSystemThemes: Record<SystemTheme, keyof Themes>;
	useSystemTheme?: boolean;

	hasLightTheme?: boolean;
	hasDarkTheme?: boolean;

	selectedTheme: keyof Themes;
	forcedTheme?: keyof Themes | "system";

	useColorScheme?: boolean;
	useThemeColor?: boolean;

	isThemeForcedAttribute?: string;
	isSystemThemeAttribute?: string;

	storage?: StorageOptions;

	attributes: ThemeAttribute[];
}

function themeScript(
	themes: ThemesRecord,
	themeIds: string[],
	selectedTheme: string,
	attributes: ThemeAttribute[],
	resolvedSystemThemes: Record<string, string>,
	useSystemTheme: boolean,
	storageMethodPriorityArray: { storageMethod: StorageMethod; priority: number }[],
	storage?: StorageOptions,
	forcedTheme?: string,
	useColorScheme?: boolean,
	useThemeColor?: boolean,
	isThemeForcedAttribute?: string,
	isSystemThemeAttribute?: string,
) {
	const rootElement = document.documentElement;

	const getPersistedTheme = (): string | undefined => {
		if (!storage) return undefined;

		const storageMethodPriority = new Map(
			storageMethodPriorityArray.map(({ storageMethod, priority }) => [storageMethod, priority]),
		);

		const persistedThemes: Map<StorageMethod, string> = new Map();

		const sortedStorageMethods = storage?.methods.toSorted(
			(a, b) => (storageMethodPriority.get(b) ?? Infinity) - (storageMethodPriority.get(a) ?? Infinity),
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
		const isDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
		return isDark ? resolvedSystemThemes.dark : resolvedSystemThemes.light;
	};

	const loadTheme = (theme: Theme) => {
		if (!theme.css?.src) return;

		const source = encodeURI(theme.css.src);

		let preloadLinkElement = document.querySelector<HTMLLinkElement>(
			`link[rel="preload"][as="style"][href="${source}"]`,
		);

		const isNew = !preloadLinkElement;

		if (!preloadLinkElement) {
			preloadLinkElement = document.createElement("link");
			preloadLinkElement.rel = "preload";
			preloadLinkElement.as = "style";
			preloadLinkElement.href = source;
		}

		const attachCss = () => {
			let stylesheetLinkElement = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${source}"]`);
			const isNew = !stylesheetLinkElement;

			if (!stylesheetLinkElement) {
				stylesheetLinkElement = document.createElement("link");
				stylesheetLinkElement.rel = "stylesheet";
				stylesheetLinkElement.href = source;
			}
			stylesheetLinkElement.onload = () => preloadLinkElement?.remove();
			stylesheetLinkElement.onerror = () => preloadLinkElement?.remove();

			if (isNew) document.head.appendChild(stylesheetLinkElement);
		};

		preloadLinkElement.onload = attachCss;

		if (preloadLinkElement.sheet) attachCss();
		if (isNew) document.head.appendChild(preloadLinkElement);
	};

	const persistedTheme = getPersistedTheme();
	const resolvedTheme =
		themes[
			useSystemTheme || (forcedTheme ?? persistedTheme) === "system"
				? resolveSystemTheme()
				: (forcedTheme ?? persistedTheme ?? selectedTheme)
		];

	loadTheme(resolvedTheme);

	const allThemeClasses = themeIds.map((id) => themes[id].className ?? id);

	for (const attribute of attributes) {
		if (attribute === "class") {
			rootElement.classList.remove(...allThemeClasses);
			rootElement.classList.add(resolvedTheme.className ?? resolvedTheme.id);
		} else {
			rootElement.setAttribute(attribute, resolvedTheme.id);
		}
	}

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

const NAME_MINIFICATION_REGEX = /^\s*__name\([^)]*\);?\s*(?:\/\/.*)?$/gm;

export function getThemeScript<const Themes extends ThemesRecord>(config: Readonly<ThemeScriptArguments<Themes>>) {
	const fn = themeScript.toString().replace(NAME_MINIFICATION_REGEX, "");

	const args = [
		config.themes,
		config.themeIds,
		config.selectedTheme,
		config.attributes,
		config.resolvedSystemThemes,
		config.useSystemTheme,
		Array.from(STORAGE_METHOD_PRIORITY.entries()),
		config.storage,
		config.forcedTheme,
		config.useColorScheme,
		config.useThemeColor,
		config.isThemeForcedAttribute,
		config.isSystemThemeAttribute,
	]
		.map((argument) => (argument === undefined ? "undefined" : safeSerializeArgument(argument)))
		.join(",");

	return `(${fn})(${args})`;
}

function safeSerializeArgument(argument: unknown): string {
	const json = JSON.stringify(argument);

	return json
		.replace(/<\/script/gi, "<\\/script")
		.replace(/<\s*\/\s*script/gi, "<\\/script")
		.replace(/<!--/g, "<\\!--")
		.replace(/<\/\w+/g, (match) => match.replace("<", "<\\"));
}
