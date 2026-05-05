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

// TODO: Make sure readonly fields have no public setter.
export interface ThemeManager<Themes extends ThemesRecord> {
	readonly themes: Themes;
	readonly themeIds: (keyof Themes)[];

	readonly enableSystemThemes?: boolean;
	readonly systemTheme?: SystemTheme;
	readonly systemThemes?: Partial<Record<SystemTheme, keyof Themes>>;
	readonly resolvedSystemThemes: Record<SystemTheme, keyof Themes>;
	readonly useSystemTheme?: boolean;
	setUseSystemTheme: (useSystemTheme: boolean) => Result<void, ThemeManagerError>;

	readonly hasLightTheme?: boolean;
	readonly hasDarkTheme?: boolean;
	readonly hasLightSystemTheme?: boolean;
	readonly hasDarkSystemTheme?: boolean;

	readonly resolvedTheme: keyof Themes;
	readonly selectedTheme: keyof Themes;
	readonly previouslyAppliedTheme?: keyof Themes;
	setSelectedTheme: (theme: keyof Themes) => Result<void, ThemeManagerError>;
	setTheme: (theme: keyof Themes | "system", shouldPersist?: boolean) => ResultAsync<void, ThemeManagerError>;

	readonly useColorScheme?: boolean;

	readonly storage?: StorageOptions;
	readonly enableTabSync?: boolean;

	readonly attributes: ThemeAttribute[];
	readonly themeClasses?: Partial<Record<keyof Themes, string>>;

	[INTERNAL]: {
		setPreviouslyAppliedTheme: (theme: keyof Themes) => void;
		setSystemTheme: (systemTheme: SystemTheme) => void;
	};
}

export type ThemesOf<M> = M extends ThemeManager<infer T> ? T : never;

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
	| typeof INTERNAL
> &
	Partial<Pick<ThemeManager<Themes>, "attributes" | "useColorScheme" | "useSystemTheme" | "enableTabSync">>;

export function createThemeManager<const Themes extends ThemesRecord>({
	themes,
	initialTheme,
	enableSystemThemes = true,
	useColorScheme = true,
	useSystemTheme = true,
	systemThemes,
	systemTheme,
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
	});

	const themeIds = Object.keys(themes) as (keyof Themes)[];
	const resolvedSystemThemes = resolveSystemThemes(themes, systemThemes);

	const resolvedTheme = $derived.by(() => {
		const resolvedThemeId =
			state.useSystemTheme && state.systemTheme ? resolvedSystemThemes[state.systemTheme] : state.selectedTheme;

		return themeIds.includes(resolvedThemeId) ? resolvedThemeId : initialTheme;
	});

	const setUseSystemTheme: (useSystemTheme: boolean) => Result<void, ThemeManagerError> = (useSystemTheme: boolean) => {
		if (!enableSystemThemes) return err(ThemeManagerError.systemThemesDisabled);

		state.useSystemTheme = useSystemTheme;
		return ok();
	};

	const setSelectedTheme = (theme: keyof Themes) => {
		return validateRequestedTheme(themeManager, theme).andTee(() => {
			state.selectedTheme = theme;
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

		setSelectedTheme,

		get previouslyAppliedTheme() {
			return state.previouslyAppliedTheme;
		},

		setTheme,

		useColorScheme,

		storage,
		enableTabSync,

		attributes,
		themeClasses,

		[INTERNAL]: {
			setSystemTheme,
			setPreviouslyAppliedTheme,
		},
	};

	return validateThemeManager(themeManager).map(() => themeManager);
}

function updateColorScheme<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!themeManager.useColorScheme || !BROWSER) return;

	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

	document.documentElement.style.colorScheme = resolvedTheme.type;

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

	if (!resolvedTheme.color) return;

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

function cleanUpStaleThemeClasses<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const staleClasses = themeManager.themeIds
		.filter((themeId) => themeId !== themeManager.resolvedTheme)
		.map((themeId) => getThemeClass(themeManager, themeId));

	for (const className of staleClasses) document.documentElement.classList.remove(className);
}

function updateAttributes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	cleanUpStaleThemeClasses(themeManager);

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

async function applyThemeToDom<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>, theme: Theme) {
	try {
		await loadTheme(theme);
	} catch {
		if (themeManager.previouslyAppliedTheme && theme.id !== themeManager.previouslyAppliedTheme) {
			console.error(`Failed to load theme '${theme.id}'. Falling back to previous theme.`);
			themeManager.setTheme(themeManager.previouslyAppliedTheme);
		} else console.error(`Failed to load theme '${theme.id}'. Aborting.`);

		// TODO: Ensure that if all themes fail to load a proper error is emitted.

		return;
	}

	unloadStaleThemes(themeManager);
	updateColorScheme(themeManager);
	updateAttributes(themeManager);

	themeManager[INTERNAL].setPreviouslyAppliedTheme(theme.id);
}

async function getPersistedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	serverSideOnly = false,
	syncOnMiss = true,
	errorOnMiss = false,
) {
	if (!themeManager.storage) return;

	const persistedThemes: Map<StorageMethod, string> = new Map();

	for (const storageMethod of themeManager.storage.methods) {
		const isLocalStorage = storageMethod === "localStorage";
		const isSessionStorage = storageMethod === "sessionStorage";
		const isCookie = storageMethod === "cookie";

		if (BROWSER && isLocalStorage && !serverSideOnly) {
			const storedTheme = localStorage.getItem(themeManager.storage.storageKey);

			if (!storedTheme) {
				if (errorOnMiss)
					console.error(
						`Failed to get theme from local storage. ${syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
		} else if (!BROWSER && isLocalStorage && !serverSideOnly)
			console.error(`Tried to get theme from local storage from a non-browser context. Skipping.`);
		else if (BROWSER && isSessionStorage && !serverSideOnly) {
			const storedTheme = sessionStorage.getItem(themeManager.storage.storageKey);

			if (!storedTheme) {
				if (errorOnMiss)
					console.error(
						`Failed to get theme from session storage. ${syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
		} else if (!BROWSER && isSessionStorage && !serverSideOnly)
			console.error(`Tried to get theme from session storage from a non-browser context. Skipping.`);
		else if (isCookie) {
			const storedTheme = await getCookie(themeManager.storage.cookie.name);

			if (!storedTheme) {
				if (errorOnMiss)
					console.error(`Failed to get theme from cookie. ${syncOnMiss ? "Marking as desynced." : "Skipping."}.`);

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

	if (syncOnMiss && dominantTheme && BROWSER) {
		const activeMethods: StorageMethod[] = serverSideOnly ? ["cookie"] : themeManager.storage.methods;
		const missingAny = activeMethods.some((storageMethod) => !persistedThemes.has(storageMethod));

		if (missingAny) persistTheme(themeManager, dominantTheme);
	}

	return dominantTheme;
}

async function persistTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	theme: keyof Themes,
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

	if (useCookie) await setCookie(theme as string, themeManager.storage.cookie);
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

		themeManager.setTheme(persistedTheme);
	});

	$effect(() => {
		const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
		applyThemeToDom(themeManager, resolvedTheme);

		return () => {
			removeStorageListener();
		};
	});
}
