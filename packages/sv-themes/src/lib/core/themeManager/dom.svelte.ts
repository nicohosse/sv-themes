import { BROWSER } from "esm-env";
import { untrack } from "svelte";
import type { ThemeRecord } from "#lib/core/theme/theme.js";
import { resolveCssColor } from "#lib/utils/resolveCssColor.js";
import { logError } from "../logger.js";
import { getPersistedThemeSync, persistTheme } from "./persistence.js";
import { INTERNAL as THEME_MANAGER_INTERNAL, type ThemeManager } from "./themeManager.js";

export function updateMetaTags<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

	if (themeManager.useColorScheme) {
		let colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

		if (!colorSchemeMetaElement) {
			colorSchemeMetaElement = document.createElement("meta");
			colorSchemeMetaElement.name = "color-scheme";
			document.head.appendChild(colorSchemeMetaElement);
		}

		const firstTheme = Object.values(themeManager.themes)[0];

		let colorSchemeContent = "light";

		if (firstTheme.type === "light" && themeManager.hasDarkTheme) colorSchemeContent = "light dark";
		else if (firstTheme.type === "dark" && themeManager.hasLightTheme) colorSchemeContent = "dark light";
		else if (!themeManager.hasLightTheme && themeManager.hasDarkTheme) colorSchemeContent = "dark";

		colorSchemeMetaElement.content = colorSchemeContent;
	}

	if (themeManager.useFavicon && resolvedTheme.favicon) {
		let faviconLink = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');

		if (!faviconLink) {
			faviconLink = document.createElement("link");
			faviconLink.rel = "icon";
			document.head.appendChild(faviconLink);
		}

		faviconLink.href = resolvedTheme.favicon;
	}

	if (!themeManager.useThemeColor) return;

	let themeColorMetaElement = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

	if (!resolvedTheme.color) {
		themeColorMetaElement?.remove();
		return;
	}

	const isColorHex = resolvedTheme.color.startsWith("#");

	let resolvedColor = resolvedTheme.color;

	if (!isColorHex) {
		const computedColor = resolveCssColor(resolvedTheme.color);

		if (computedColor.isOk()) resolvedColor = computedColor.value;
		else {
			logError(
				`The color of theme '${resolvedTheme.id}' couldn't be resolved. ${computedColor.error.message} Removing theme-color meta element.`,
				themeManager,
			);

			themeColorMetaElement?.remove();

			return;
		}
	}

	if (!themeColorMetaElement) {
		themeColorMetaElement = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);
	}

	themeColorMetaElement.content = resolvedColor;
}

export function cleanupThemeClasses<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const classesToRemove = themeManager.themeIds
		.filter((themeId) => themeId !== themeManager.resolvedTheme)
		.map((themeId) => themeManager.themes[themeId].className ?? (themeId as string));

	for (const className of classesToRemove) document.documentElement.classList.remove(className);
}

export function updateAttributes<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	cleanupThemeClasses(themeManager);

	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

	if (themeManager.useColorScheme) document.documentElement.style.colorScheme = resolvedTheme.type;

	if (themeManager.isThemeForcedAttribute)
		if (themeManager.forcedTheme) document.documentElement.setAttribute(themeManager.isThemeForcedAttribute, "true");
		else document.documentElement.removeAttribute(themeManager.isThemeForcedAttribute);

	if (themeManager.isSystemThemeAttribute)
		if (themeManager.resolvedUseSystemTheme)
			document.documentElement.setAttribute(themeManager.isSystemThemeAttribute, "true");
		else document.documentElement.removeAttribute(themeManager.isSystemThemeAttribute);

	for (const attribute of themeManager.attributes)
		if (attribute === "class") document.documentElement.classList.add(resolvedTheme.className ?? resolvedTheme.id);
		else document.documentElement.setAttribute(attribute, resolvedTheme.id);
}

export function registerMediaListener<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	if (themeManager.systemThemes.kind === "disabled" || !BROWSER) return () => {};

	const media = globalThis.matchMedia("(prefers-color-scheme: dark)");

	const updateSystemTheme = (matches: boolean) =>
		themeManager[THEME_MANAGER_INTERNAL].setSystemTheme(matches ? "dark" : "light");

	void updateSystemTheme(media.matches);

	let currentPromise = Promise.resolve();

	const onChange = (event: MediaQueryListEvent) => {
		currentPromise = currentPromise.then(async () => {
			const result = await updateSystemTheme(event.matches);
			if (result.isErr()) logError(result.error.message, themeManager);
		});
	};

	media.addEventListener("change", onChange);

	return () => {
		media.removeEventListener("change", onChange);
	};
}

export function updateDom<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	updateMetaTags(themeManager);
	updateAttributes(themeManager);
}

export function registerStorageListener<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER || !themeManager.storage || !themeManager.enableTabSync) return () => {};

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");

	if (!useLocalStorage && !useSessionStorage) return () => {};

	const onStorage = async (event: StorageEvent) => {
		const isThemeKey = event.key === themeManager.storage?.key;
		if (!isThemeKey) return;

		// `removeItem`/`clear` fire with a null key or value. There is no theme to apply,
		// so ignore the event instead of attempting to parse `null`.
		if (event.key === null || event.newValue === null) return;

		const isLocalStorage = Object.is(event.storageArea, globalThis.localStorage);
		const isSessionStorage = Object.is(event.storageArea, globalThis.sessionStorage);

		if ((useLocalStorage && isLocalStorage) || (useSessionStorage && isSessionStorage)) {
			const storageTheme = event.newValue as keyof Themes | "system";

			const result = await themeManager.setTheme(storageTheme);
			if (result.isOk()) return;

			logError(
				`Invalid theme found in ${isLocalStorage ? "local" : "session"} storage: ${result.error.message}\nAuto-fixing...`,
				themeManager,
			);

			await persistTheme(themeManager, themeManager.selectedTheme);
		}
	};

	globalThis.addEventListener("storage", onStorage);

	return () => {
		globalThis.removeEventListener("storage", onStorage);
	};
}

export function registerThemeManager<const Themes extends ThemeRecord>(themeManager: ThemeManager<Themes>) {
	// Read persistence synchronously during initialization so the client state matches the
	// theme already applied by the head bootloader. This avoids a flash of the wrong theme
	// and prevents a late async read from overwriting a user's selection.
	const persistedTheme = getPersistedThemeSync(themeManager);
	if (persistedTheme) themeManager[THEME_MANAGER_INTERNAL].applyPersistedTheme(persistedTheme);

	$effect.pre(() => {
		const removeStorageListener = registerStorageListener(themeManager);
		const removeMediaListener = registerMediaListener(themeManager);

		return () => {
			removeStorageListener();
			removeMediaListener();
		};
	});

	let currentSetForcedThemePromise = Promise.resolve();

	$effect.pre(() => {
		const dominantForcedTheme = themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme as
			| keyof Themes
			| "system"
			| undefined;

		untrack(() => {
			if (themeManager.forcedTheme !== dominantForcedTheme)
				currentSetForcedThemePromise = currentSetForcedThemePromise.then(async () => {
					const result = await themeManager.setForcedTheme(dominantForcedTheme);
					if (result.isErr()) logError(result.error.message, themeManager);
				});
		});
	});

	$effect.pre(() => {
		themeManager.resolvedTheme;
		themeManager.resolvedUseSystemTheme;

		updateDom(themeManager);
	});
}
