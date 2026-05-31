import type {
	StorageMethod,
	StorageOptions,
	SystemTheme,
	ThemeAttribute,
	ThemeManager,
	ThemeRecord,
} from "$lib/index.js";
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
	| "isThemeForcedAttribute"
	| "isSystemThemeAttribute"
	| "storage"
	| "attributes"
> &
	Partial<Pick<ThemeManager<Themes>, "useColorScheme" | "useThemeColor">>;

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

	const getSystemTheme = () => {
		const isDark = globalThis.matchMedia("(prefers-color-scheme: dark)").matches;
		return (isDark ? "dark" : "light") as SystemTheme;
	};

	const createOrUpdateColorSchemeMetaTag = () => {
		if (!useColorScheme) return;

		let colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

		if (!resolvedTheme) {
			colorSchemeMetaElement?.remove();
			return;
		}

		rootElement.style.colorScheme = resolvedTheme.type;

		if (!colorSchemeMetaElement) {
			colorSchemeMetaElement = document.createElement("meta");
			colorSchemeMetaElement.name = "color-scheme";
			document.head.appendChild(colorSchemeMetaElement);
		}

		const firstThemeId = themeIds[0];

		const themeValues = Object.values(themes);
		const hasLightTheme = !!themeValues.find((theme) => theme.type === "light");
		const hasDarkTheme = !!themeValues.find((theme) => theme.type === "dark");

		const firstThemeType = themes[firstThemeId].type;

		let colorSchemeContent = "light";

		if (firstThemeType === "light" && hasDarkTheme) colorSchemeContent = "light dark";
		else if (firstThemeType === "dark" && hasLightTheme) colorSchemeContent = "dark light";
		else if (!hasLightTheme && hasDarkTheme) colorSchemeContent = "dark";

		colorSchemeMetaElement.content = colorSchemeContent;
	};

	const createOrUpdateThemeColorMetaTag = () => {
		if (!useThemeColor) return;

		let themeColorMetaElement = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

		if (!resolvedTheme?.color) {
			themeColorMetaElement?.remove();
			return;
		}

		if (!themeColorMetaElement) {
			themeColorMetaElement = document.createElement("meta");
			themeColorMetaElement.name = "theme-color";
			document.head.appendChild(themeColorMetaElement);
		}

		let resolvedColor: string | undefined;

		const isColorHex = resolvedTheme.color.startsWith("#");

		if (!isColorHex) {
			const resolverElement = document.createElement("div");
			resolverElement.style.display = "none";
			rootElement.appendChild(resolverElement);

			const normalizeColor = (color: string): string => {
				resolverElement.style.color = color;

				return getComputedStyle(resolverElement).color;
			};

			const VAR_REGEX = /^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/;

			const resolveCssColor = (value: string): string | undefined => {
				const varMatch = VAR_REGEX.exec(value);

				if (!varMatch) return normalizeColor(value);

				const [, variableName, fallback] = varMatch;

				const variableValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

				if (!variableValue) {
					if (fallback) return resolveCssColor(fallback);
					return undefined;
				}

				return normalizeColor(variableValue);
			};

			const computedColor = resolveCssColor(resolvedTheme.color);

			if (computedColor) resolvedColor = computedColor;
		} else resolvedColor = resolvedTheme.color;

		if (resolvedColor) themeColorMetaElement.content = resolvedColor;
		else themeColorMetaElement.remove();
	};

	const persistedTheme = getPersistedTheme();

	const resolvedUseSystemTheme =
		systemThemes.kind === "enabled" &&
		((!forcedTheme && useSystemTheme) || (forcedTheme ?? persistedTheme) === "system");

	const resolvedTheme =
		themes[
			(resolvedUseSystemTheme && systemThemes.kind === "enabled"
				? systemThemes.mappings[getSystemTheme()]
				: ((forcedTheme === "system" ? undefined : forcedTheme) ?? persistedTheme ?? selectedTheme)) ?? initialTheme
		];

	if (isThemeForcedAttribute)
		if (forcedTheme) rootElement.setAttribute(isThemeForcedAttribute, "true");
		else rootElement.removeAttribute(isThemeForcedAttribute);

	if (isSystemThemeAttribute)
		if (useSystemTheme) rootElement.setAttribute(isSystemThemeAttribute, "true");
		else rootElement.removeAttribute(isSystemThemeAttribute);

	createOrUpdateColorSchemeMetaTag();
	createOrUpdateThemeColorMetaTag();

	if (!resolvedTheme) {
		if (document.currentScript) document.currentScript.remove();
		return;
	}

	const allThemeClasses = themeIds.map((id) => themes[id].className ?? id);

	for (const attribute of attributes)
		if (attribute === "class") {
			rootElement.classList.remove(...allThemeClasses);
			rootElement.classList.add(resolvedTheme.className ?? resolvedTheme.id);
		} else rootElement.setAttribute(attribute, resolvedTheme.id);

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
