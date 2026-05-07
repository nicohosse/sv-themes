import type { ThemeAttribute, ThemesRecord } from "./theme.ts";
import {
	STORAGE_METHOD_PRIORITY,
	type StorageMethod,
	type StorageOptions,
	type SystemTheme,
} from "./theme-manager.svelte.ts";

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
	storageMethodPriorityArray: { storageMethod: StorageMethod; priority: number }[],
	storage?: StorageOptions,
	forcedTheme?: string,
	useColorScheme?: boolean,
	useThemeColor?: boolean,
	useSystemTheme?: boolean,
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
			dominantTheme = storedTheme ?? dominantTheme;
		}

		return dominantTheme && (dominantTheme === "system" || themeIds.includes(dominantTheme))
			? dominantTheme
			: undefined;
	};

	const resolveSystemTheme = () => {
		const isDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
		return isDark ? resolvedSystemThemes.dark : resolvedSystemThemes.light;
	};

	const persistedTheme = getPersistedTheme();
	const resolvedTheme =
		themes[
			useSystemTheme || (forcedTheme ?? persistedTheme) === "system"
				? resolveSystemTheme()
				: (forcedTheme ?? persistedTheme ?? selectedTheme)
		];

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
			const hasLightTheme = !!Object.values(themes).find((theme) => theme.type === "light");
			const hasDarkTheme = !!Object.values(themes).find((theme) => theme.type === "dark");

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

export function getThemeScript<const Themes extends ThemesRecord>(config: Readonly<ThemeScriptArguments<Themes>>) {
	const fn = themeScript.toString().replace(/\s*__name\s*\([^)]*\)\s*;?\s*/g, "");

	const args = [
		config.themes,
		config.themeIds,
		config.selectedTheme,
		config.attributes,
		config.resolvedSystemThemes,
		Array.from(STORAGE_METHOD_PRIORITY.entries()),
		config.storage,
		config.forcedTheme,
		config.useColorScheme,
		config.useThemeColor,
		config.useSystemTheme,
		config.isThemeForcedAttribute,
		config.isSystemThemeAttribute,
	]
		.map((argument) => (argument === undefined ? "undefined" : JSON.stringify(argument)))
		.join(",");

	return `(${fn})(${args})`;
}
