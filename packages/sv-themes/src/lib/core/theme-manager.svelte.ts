import type { Cookies } from "@sveltejs/kit";
import { BROWSER } from "esm-env";
import { err, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import { onMount } from "svelte";
import { type CookieOptions, getCookie, setCookie } from "../utils/cookie.ts";
import { resolveCssColor } from "../utils/resolve-css-color.ts";
import { hasCss, loadTheme, type Theme, type ThemeAttribute, type ThemesRecord, unloadTheme } from "./theme.ts";
import { getErrorMessage, ThemeManagerError } from "./theme-manager.errors.ts";

export function createThemes<const Themes extends readonly Theme[]>(
	themes: Themes,
): Result<ThemesRecord<Themes[number]["id"]>, ThemeManagerError[]> {
	const seen = new Set<string>();
	const duplicates: string[] = [];

	for (const theme of themes)
		if (seen.has(theme.id)) duplicates.push(theme.id);
		else seen.add(theme.id);

	if (duplicates.length > 0)
		return err(duplicates.map((duplicateTheme) => ThemeManagerError.duplicateTheme(duplicateTheme)));

	return ok(Object.fromEntries(themes.map((theme) => [theme.id, theme])) as ThemesRecord<Themes[number]["id"]>);
}

export const DEFAULT_THEMES = createThemes([
	{ id: "light", type: "light", color: "#fff" },
	{ id: "dark", type: "dark", color: "#000" },
]).match(
	(themes) => themes,
	(errors) => {
		throw new Error(`Failed to create themes: ${JSON.stringify(errors.map((error) => getErrorMessage(error)))}`);
	},
);

export type DefaultTheme = keyof typeof DEFAULT_THEMES;

export type SystemTheme = "light" | "dark";

const DEFAULT_THEME_COOKIE_OPTIONS: CookieOptions = {
	name: "theme",
} as const;

export type StorageMethod = "localStorage" | "sessionStorage" | "cookie";
const STORAGE_METHOD_PRIORITY: StorageMethod[] = ["sessionStorage", "localStorage", "cookie"];

export const HYBRID_STORAGE_METHODS: StorageMethod[] = ["cookie", "localStorage"] as const;

export interface StorageOptions {
	methods: StorageMethod[];
	storageKey: string;
	cookie: CookieOptions;
}

const DEFAULT_STORAGE_HYBRID: StorageOptions = {
	methods: HYBRID_STORAGE_METHODS,
	storageKey: "theme",
	cookie: DEFAULT_THEME_COOKIE_OPTIONS,
} as const;

const INTERNAL = Symbol("internal");

// TODO: Make sure the create type is proper.
// TODO: Events for transitions
export interface ThemeManager<Themes extends ThemesRecord> {
	readonly themes: Themes;
	readonly themeIds: (keyof Themes)[];

	readonly enableSystemThemes?: boolean;
	readonly systemTheme?: SystemTheme;
	readonly systemThemes?: Partial<Record<SystemTheme, keyof Themes>>;
	readonly resolvedSystemThemes: Record<SystemTheme, keyof Themes>;
	readonly useSystemTheme?: boolean;
	readonly setUseSystemTheme: (useSystemTheme: boolean) => Result<void, ThemeManagerError>;

	readonly hasLightTheme?: boolean;
	readonly hasDarkTheme?: boolean;
	readonly hasLightSystemTheme?: boolean;
	readonly hasDarkSystemTheme?: boolean;

	readonly resolvedTheme: keyof Themes;
	readonly selectedTheme: keyof Themes;
	readonly forcedTheme?: keyof Themes | "system";
	readonly previouslyAppliedTheme?: keyof Themes;
	readonly setSelectedTheme: (theme: keyof Themes) => Result<void, ThemeManagerError>;
	readonly setForcedTheme: (theme?: keyof Themes | "system") => Result<void, ThemeManagerError>;
	readonly setTheme: (theme: keyof Themes | "system", shouldPersist?: boolean) => ResultAsync<void, ThemeManagerError>;

	readonly useColorScheme?: boolean;
	readonly useThemeColor?: boolean;

	readonly themeForcedAttribute?: string;
	readonly isSystemThemeAttribute?: string;

	readonly storage?: StorageOptions;
	readonly enableTabSync?: boolean;

	readonly attributes: ThemeAttribute[];
	readonly themeClasses?: Partial<Record<keyof Themes, string>>;

	[INTERNAL]: Readonly<{
		setPreviouslyAppliedTheme: (theme: keyof Themes) => void;
		setSystemTheme: (systemTheme: SystemTheme) => void;
	}>;
}

export type ThemesOf<M> = M extends ThemeManager<infer T> ? keyof T : never;

export function validateRequestedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	requestedTheme: keyof Themes,
): Result<void, ThemeManagerError> {
	if (!themeManager.themeIds.includes(requestedTheme))
		return err(ThemeManagerError.themeNotFound(requestedTheme as string));

	return ok();
}

function validateSystemTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	systemTheme: SystemTheme,
): Result<void, ThemeManagerError> {
	const hasSystemTheme = systemTheme === "light" ? themeManager.hasLightSystemTheme : themeManager.hasDarkSystemTheme;
	const resolvedSystemThemeId =
		systemTheme === "light" ? themeManager.resolvedSystemThemes.light : themeManager.resolvedSystemThemes.dark;

	if (hasSystemTheme && themeManager.themes[resolvedSystemThemeId].type !== systemTheme)
		return err(ThemeManagerError.systemThemeInvalidType(systemTheme));
	else if (!hasSystemTheme) return err(ThemeManagerError.systemThemeUnassigned(systemTheme));

	return ok();
}

function validateTheme(theme: Theme): Result<void, ThemeManagerError> {
	if (theme.css) {
		const src = theme.css.src;
		if (!src.trim() || !src.endsWith(".css")) return err(ThemeManagerError.themeInvalidCssSrc(src));
	}

	if (theme.id === "system") return err(ThemeManagerError.themeInvalidId(theme.id));

	return ok();
}

function validateThemeManager<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
): Result<void, ThemeManagerError[]> {
	const errors = [];

	if (themeManager.themeIds.length < 1) errors.push(ThemeManagerError.noThemes);

	for (const theme of Object.values(themeManager.themes)) {
		const themeResult = validateTheme(theme);
		if (themeResult.isErr()) errors.push(themeResult.error);
	}

	const selectedThemeResult = validateRequestedTheme(themeManager, themeManager.selectedTheme);
	if (selectedThemeResult.isErr()) errors.push(selectedThemeResult.error);

	if (themeManager.enableSystemThemes) {
		const lightThemeResult = validateSystemTheme(themeManager, "light");
		if (lightThemeResult.isErr()) errors.push(lightThemeResult.error);

		const darkThemeResult = validateSystemTheme(themeManager, "dark");
		if (darkThemeResult.isErr()) errors.push(darkThemeResult.error);
	}

	if (errors.length > 0) return err(errors);

	return ok();
}

function resolveSystemThemes<const Themes extends ThemesRecord>(
	themes: Themes,
	systemThemes?: Partial<Record<SystemTheme, keyof Themes>>,
): Record<SystemTheme, keyof Themes> {
	const themeValues = Object.values(themes);
	const firstLightTheme = themeValues.find((theme) => theme.type === "light")?.id;
	const firstDarkTheme = themeValues.find((theme) => theme.type === "dark")?.id;

	return {
		light: systemThemes?.light ?? firstLightTheme ?? "light",
		dark: systemThemes?.dark ?? firstDarkTheme ?? "dark",
	};
}

type CreateThemeManagerInput<Themes extends ThemesRecord> = {
	initialTheme: keyof Themes;
	enableSystemThemes?: boolean;
} & Omit<
	ThemeManager<Themes>,
	| "setTheme"
	| "themeIds"
	| "attributes"
	| "useColorScheme"
	| "useSystemTheme"
	| "resolvedTheme"
	| "setSelectedTheme"
	| "selectedTheme"
	| "setUseSystemTheme"
	| "enableTabSync"
	| "setForcedTheme"
	| "useThemeColor"
	| "resolvedSystemThemes"
	| typeof INTERNAL
> &
	Partial<
		Pick<ThemeManager<Themes>, "attributes" | "useColorScheme" | "useSystemTheme" | "enableTabSync" | "useThemeColor">
	>;

export function createThemeManager<const Themes extends ThemesRecord>({
	themes,
	initialTheme,
	enableSystemThemes = true,
	useColorScheme = true,
	useSystemTheme = true,
	useThemeColor = true,
	themeForcedAttribute = "data-theme-forced",
	isSystemThemeAttribute = "data-is-system-theme",
	systemThemes,
	systemTheme,
	forcedTheme,
	storage = DEFAULT_STORAGE_HYBRID,
	enableTabSync = true,
	attributes = ["class", "data-theme"],
	themeClasses,
}: CreateThemeManagerInput<Themes>): Result<ThemeManager<Themes>, ThemeManagerError[]> {
	const state = $state({
		useSystemTheme,
		selectedTheme: initialTheme,
		previouslyAppliedTheme: initialTheme,
		systemTheme,
		forcedTheme,
	});

	const themeIds = Object.keys(themes) as (keyof Themes)[];
	const resolvedSystemThemes = resolveSystemThemes(themes, systemThemes);

	const resolvedTheme = $derived.by(() => {
		const resolvedThemeId =
			(state.useSystemTheme || state.forcedTheme === "system") && state.systemTheme
				? resolvedSystemThemes[state.systemTheme]
				: (state.forcedTheme ?? state.selectedTheme);

		return themeIds.includes(resolvedThemeId) ? resolvedThemeId : initialTheme;
	});

	const setUseSystemTheme: (useSystemTheme: boolean) => Result<void, ThemeManagerError> = (useSystemTheme: boolean) => {
		if (!themeManager.enableSystemThemes) return err(ThemeManagerError.systemThemesDisabled);

		state.useSystemTheme = useSystemTheme;
		return ok();
	};

	const setSelectedTheme = (theme: keyof Themes) => {
		return validateRequestedTheme(themeManager, theme).andTee(() => {
			state.selectedTheme = theme;
		});
	};

	const setForcedTheme = (theme?: keyof Themes | "system") => {
		if (theme === "system" && !themeManager.enableSystemThemes) return err(ThemeManagerError.systemThemesDisabled);

		if (!theme) {
			state.forcedTheme = undefined;
			return ok();
		}

		return validateRequestedTheme(themeManager, theme).andTee(() => {
			state.forcedTheme = theme;
		});
	};

	const setTheme = (theme: keyof Themes | "system", shouldPersist = true) => {
		return setUseSystemTheme(theme === "system")
			.asyncAndThen(() =>
				shouldPersist
					? ResultAsync.fromPromise(persistTheme(themeManager, theme), () => undefined as never)
					: okAsync(),
			)
			.andThen(() => (theme === "system" ? okAsync() : setSelectedTheme(theme)));
	};

	const setSystemTheme = (systemTheme: SystemTheme) => {
		state.systemTheme = systemTheme;
	};

	const setPreviouslyAppliedTheme = (theme: keyof Themes) => {
		state.previouslyAppliedTheme = theme;
	};

	const hasLightTheme = !!Object.values(themes).find((theme) => theme.type === "light");
	const hasDarkTheme = !!Object.values(themes).find((theme) => theme.type === "dark");

	const hasLightSystemTheme =
		themeIds.includes(resolvedSystemThemes.light) && themes[resolvedSystemThemes.light].type === "light";

	const hasDarkSystemTheme =
		themeIds.includes(resolvedSystemThemes.dark) && themes[resolvedSystemThemes.dark].type === "dark";

	const themeManager: ThemeManager<Themes> = {
		themes,
		themeIds,

		enableSystemThemes,

		get systemTheme() {
			return state.systemTheme;
		},

		systemThemes,
		resolvedSystemThemes,

		get useSystemTheme() {
			return state.useSystemTheme;
		},

		setUseSystemTheme,

		hasLightTheme,
		hasDarkTheme,
		hasLightSystemTheme,
		hasDarkSystemTheme,

		get resolvedTheme() {
			return resolvedTheme;
		},

		get selectedTheme() {
			return state.selectedTheme;
		},

		get forcedTheme() {
			return state.forcedTheme;
		},

		setSelectedTheme,

		get previouslyAppliedTheme() {
			return state.previouslyAppliedTheme;
		},

		setTheme,
		setForcedTheme,

		useColorScheme,
		useThemeColor,

		themeForcedAttribute,
		isSystemThemeAttribute,

		storage,
		enableTabSync,

		attributes,
		themeClasses,

		[INTERNAL]: {
			setSystemTheme,
			setPreviouslyAppliedTheme,
		},
	};

	return validateThemeManager(themeManager).map(() => {
		Object.freeze(themeManager[INTERNAL]);
		return Object.freeze(themeManager);
	});
}

function updateMegaTags<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

	if (themeManager.useColorScheme) {
		let colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

		if (!colorSchemeMetaElement) {
			colorSchemeMetaElement = document.createElement("meta");
			colorSchemeMetaElement.name = "color-scheme";
			document.head.appendChild(colorSchemeMetaElement);
		}

		const firstTheme = Object.values(themeManager.themes).at(0);

		if (firstTheme) {
			let colorSchemeContent = "light";

			if (firstTheme.type === "light" && themeManager.hasDarkTheme) colorSchemeContent = "light dark";
			else if (firstTheme.type === "dark" && themeManager.hasLightTheme) colorSchemeContent = "dark light";
			else if (!themeManager.hasLightTheme && themeManager.hasDarkTheme) colorSchemeContent = "dark";

			colorSchemeMetaElement.content = colorSchemeContent;
		}
	}

	if (!themeManager.useThemeColor || !resolvedTheme.color) return;

	let resolvedColor = resolvedTheme.color;

	const isColorHex = resolvedColor.startsWith("#");

	if (!isColorHex) {
		const computedColor = resolveCssColor(resolvedTheme.color);

		if (computedColor) resolvedColor = computedColor;
		else {
			console.error(
				`The color of theme '${resolvedTheme.id}' couldn't be resolved. Skipping theme-color meta element.`,
			);
			return;
		}
	}

	let themeColorMetaElement = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

	if (!themeColorMetaElement) {
		themeColorMetaElement = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);
	}

	themeColorMetaElement.content = resolvedColor;
}

export function getThemeClass<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	theme: keyof Themes,
) {
	const themeClasses = themeManager.themeClasses;
	return (themeClasses && theme in themeClasses && themeClasses[theme] ? themeClasses[theme] : theme) as string;
}

function unloadStaleThemes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	Object.values(themeManager.themes)
		.filter(hasCss)
		.filter((theme) => theme.id !== themeManager.resolvedTheme && theme.css.lazyLoading)
		.forEach((theme) => {
			unloadTheme(theme);
		});
}

function cleanUpThemeClasses<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const classesToRemove = themeManager.themeIds
		.filter((themeId) => themeId !== themeManager.resolvedTheme)
		.map((themeId) => getThemeClass(themeManager, themeId));

	for (const className of classesToRemove) document.documentElement.classList.remove(className);
}

function updateAttributes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	cleanUpThemeClasses(themeManager);

	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

	if (themeManager.useColorScheme) document.documentElement.style.colorScheme = resolvedTheme.type;

	if (themeManager.themeForcedAttribute)
		if (themeManager.forcedTheme) document.documentElement.setAttribute(themeManager.themeForcedAttribute, "true");
		else document.documentElement.removeAttribute(themeManager.themeForcedAttribute);

	if (themeManager.isSystemThemeAttribute)
		if (themeManager.useSystemTheme || themeManager.forcedTheme === "system")
			document.documentElement.setAttribute(themeManager.isSystemThemeAttribute, "true");
		else document.documentElement.removeAttribute(themeManager.isSystemThemeAttribute);

	for (const attribute of themeManager.attributes) {
		if (attribute === "class") {
			const themeClass = getThemeClass(themeManager, themeManager.resolvedTheme);
			document.documentElement.classList.add(themeClass);
		} else document.documentElement.setAttribute(attribute, themeManager.resolvedTheme as string);
	}
}

function registerMediaListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!themeManager.enableSystemThemes || !BROWSER) return;

	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const updateSystemTheme = (matches: boolean) => themeManager[INTERNAL].setSystemTheme(matches ? "dark" : "light");

	updateSystemTheme(media.matches);

	media.addEventListener("change", (event) => {
		updateSystemTheme(event.matches);
	});
}

function removeThemeFromDom<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const classesToRemove = themeManager.themeIds.map((themeId) => getThemeClass(themeManager, themeId));
	for (const className of classesToRemove) document.documentElement.classList.remove(className);

	const attributes = themeManager.attributes.filter((attribute) => attribute !== "class");
	for (const attribute of attributes) document.documentElement.removeAttribute(attribute);

	const colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
	if (colorSchemeMetaElement) colorSchemeMetaElement.remove();

	const themeColorMetaElement = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
	if (themeColorMetaElement) themeColorMetaElement.remove();

	document.documentElement.style.removeProperty("color-scheme");
}

async function applyThemeToDom<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>, theme: Theme) {
	try {
		await loadTheme(theme);
	} catch {
		if (themeManager.previouslyAppliedTheme && theme.id !== themeManager.previouslyAppliedTheme) {
			console.error(`Failed to load theme '${theme.id}'. Falling back to previous theme.`);
			themeManager.setTheme(themeManager.previouslyAppliedTheme);
			return;
		}

		console.error(`Failed to load theme '${theme.id}'. Aborting and cleaning-up DOM.`);
		removeThemeFromDom(themeManager);

		return;
	}

	unloadStaleThemes(themeManager);
	updateMegaTags(themeManager);
	updateAttributes(themeManager);

	themeManager[INTERNAL].setPreviouslyAppliedTheme(theme.id);
}

interface GetPersistedThemeConfig {
	serverSideOnly?: boolean;
	syncOnMiss?: boolean;
	errorOnMiss?: boolean;
	cookies?: Cookies;
}

export async function getPersistedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	config?: GetPersistedThemeConfig,
) {
	if (!themeManager.storage) return;
	const persistedThemes: Map<StorageMethod, string> = new Map();

	for (const storageMethod of themeManager.storage.methods) {
		const isLocalStorage = storageMethod === "localStorage";
		const isSessionStorage = storageMethod === "sessionStorage";
		const isCookie = storageMethod === "cookie";

		if (BROWSER && isLocalStorage && !config?.serverSideOnly) {
			const storedTheme = localStorage.getItem(themeManager.storage.storageKey);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from local storage. ${config?.syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
		} else if (!BROWSER && isLocalStorage && !config?.serverSideOnly)
			console.error(`Tried to get theme from local storage from a non-browser context. Skipping.`);
		else if (BROWSER && isSessionStorage && !config?.serverSideOnly) {
			const storedTheme = sessionStorage.getItem(themeManager.storage.storageKey);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from session storage. ${config?.syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
		} else if (!BROWSER && isSessionStorage && !config?.serverSideOnly)
			console.error(`Tried to get theme from session storage from a non-browser context. Skipping.`);
		else if (isCookie) {
			const storedTheme = await getCookie(themeManager.storage.cookie.name, config?.cookies);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from cookie. ${config?.syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
		}
	}

	let dominantTheme: string | undefined;

	for (const storageMethod of STORAGE_METHOD_PRIORITY) {
		if (!persistedThemes.has(storageMethod)) continue;

		dominantTheme = persistedThemes.get(storageMethod);
		break;
	}

	if (config?.syncOnMiss && dominantTheme && BROWSER) {
		const activeMethods: StorageMethod[] = config?.serverSideOnly ? ["cookie"] : themeManager.storage.methods;
		const missingAny = activeMethods.some((storageMethod) => !persistedThemes.has(storageMethod));

		if (missingAny) persistTheme(themeManager, dominantTheme, config?.cookies);
	}

	return dominantTheme;
}

export async function persistTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	theme: keyof Themes,
	cookies?: Cookies,
) {
	if (!themeManager.storage) return;

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");
	const useCookie = themeManager.storage.methods?.includes("cookie");

	const themeId = theme as string;

	if (BROWSER && useLocalStorage) localStorage.setItem(themeManager.storage.storageKey, themeId);
	else if (!BROWSER && useLocalStorage)
		console.error(`Tried to save theme '${themeId}' to local storage in a non-browser context. Skipping.`);

	if (BROWSER && useSessionStorage) sessionStorage.setItem(themeManager.storage.storageKey, themeId);
	else if (!BROWSER && useSessionStorage)
		console.error(`Tried to save theme '${themeId}' to session storage in a non-browser context. Skipping.`);

	if (useCookie) await setCookie(theme as string, themeManager.storage.cookie, cookies);
}

function registerStorageListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER || !themeManager.storage || !themeManager.enableTabSync) return () => {};

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");

	if (!useLocalStorage && !useSessionStorage) return () => {};

	const onStorage = (event: StorageEvent) => {
		const isThemeKey = event.key === themeManager.storage?.storageKey;
		if (!isThemeKey) return;

		const isLocalStorage = event.storageArea === localStorage;
		const isSessionStorage = event.storageArea === sessionStorage;

		if ((useLocalStorage && isLocalStorage) || (useSessionStorage && isSessionStorage)) {
			const storageTheme = event.newValue as keyof Themes | "system";

			if (
				(storageTheme !== "system" && !themeManager.themeIds.includes(storageTheme)) ||
				(storageTheme === "system" && themeManager.useSystemTheme) ||
				(storageTheme !== "system" && themeManager.selectedTheme === storageTheme)
			)
				return;

			themeManager.setTheme(storageTheme);
		}
	};

	globalThis.addEventListener("storage", onStorage);

	return () => {
		globalThis.removeEventListener("storage", onStorage);
	};
}

export function registerThemeManager<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	registerMediaListener(themeManager);

	const removeStorageListener = registerStorageListener(themeManager);

	onMount(async () => {
		if (!themeManager.storage) return;

		const persistedTheme = await getPersistedTheme(themeManager);
		if (!persistedTheme) return;

		themeManager.setTheme(persistedTheme, false);
	});

	$effect(() => {
		const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
		applyThemeToDom(themeManager, resolvedTheme);

		return () => {
			removeStorageListener();
		};
	});
}
