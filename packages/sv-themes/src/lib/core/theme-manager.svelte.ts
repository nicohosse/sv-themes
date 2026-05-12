import type { Cookies } from "@sveltejs/kit";
import { BROWSER } from "esm-env";
import { err, errAsync, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import { untrack } from "svelte";
import { forceThemeRegistry } from "$lib/contexts/force-theme-requests-context.svelte.js";
import { type CookieOptions, getCookie, setCookie } from "../utils/cookie.js";
import { resolveCssColor } from "../utils/resolve-css-color.js";
import type {
	AfterThemeChangeEvent,
	BeforeThemeChangeEvent,
	ForcedThemeEvent,
	Listener,
	SystemThemeChangeEvent,
	ThemeEvents,
	ThemeLoadErrorEvent,
} from "./theme.events.js";
import {
	isThemeWithCss,
	loadTheme,
	preloadTheme,
	type Theme,
	type ThemeAttribute,
	type ThemesRecord,
	unloadTheme,
} from "./theme.js";
import { getErrorMessage, ThemeManagerError } from "./theme-manager.errors.js";

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

export const STORAGE_METHOD_PRIORITY = new Map<StorageMethod, number>([
	["sessionStorage", 0],
	["localStorage", 1],
	["cookie", 2],
] as const);

export const HYBRID_STORAGE_METHODS: StorageMethod[] = ["cookie", "localStorage"] as const;

export interface StorageOptions {
	methods: StorageMethod[];
	key: string;
	cookie: CookieOptions;
}

const DEFAULT_STORAGE_HYBRID: StorageOptions = {
	methods: HYBRID_STORAGE_METHODS,
	key: "theme",
	cookie: DEFAULT_THEME_COOKIE_OPTIONS,
} as const;

const INTERNAL = Symbol("internal");

export interface ThemeManager<Themes extends ThemesRecord = ThemesRecord> {
	readonly themes: Themes;
	readonly themeIds: (keyof Themes)[];

	readonly enableSystemThemes?: boolean;
	readonly systemTheme?: SystemTheme;
	readonly systemThemes?: Partial<Record<SystemTheme, keyof Themes>>;
	readonly resolvedSystemThemes: Record<SystemTheme, keyof Themes>;
	readonly useSystemTheme?: boolean;
	readonly resolvedUseSystemTheme?: boolean;

	readonly hasLightTheme?: boolean;
	readonly hasDarkTheme?: boolean;
	readonly hasLightSystemTheme?: boolean;
	readonly hasDarkSystemTheme?: boolean;

	readonly initialTheme: keyof Themes;
	readonly resolvedTheme: keyof Themes;
	readonly selectedTheme: keyof Themes;
	readonly forcedTheme?: keyof Themes | "system";
	readonly previouslyAppliedTheme?: keyof Themes;
	readonly unavailableThemes: Partial<Record<keyof Themes, number>>;
	isForcedThemeLocked?: boolean;
	readonly setForcedTheme: (theme?: keyof Themes | "system", lock?: boolean) => ResultAsync<void, ThemeManagerError>;
	readonly setTheme: (theme: keyof Themes | "system", shouldPersist?: boolean) => ResultAsync<void, ThemeManagerError>;

	readonly useColorScheme?: boolean;
	readonly useThemeColor?: boolean;

	readonly isThemeForcedAttribute?: string;
	readonly isSystemThemeAttribute?: string;

	readonly storage?: StorageOptions;
	readonly enableTabSync?: boolean;

	readonly attributes: ThemeAttribute[];

	readonly on: <Event extends keyof ThemeEvents<Themes>>(
		event: Event,
		handler: Listener<ThemeEvents<Themes>[Event]>,
	) => void;

	[INTERNAL]: Readonly<{
		setSystemTheme: (systemTheme: SystemTheme) => Promise<void>;
		setUseSystemTheme: (useSystemTheme: boolean) => Result<void, ThemeManagerError>;

		setSelectedTheme: (theme: keyof Themes) => Result<void, ThemeManagerError>;
		setPreviouslyAppliedTheme: (theme: keyof Themes) => void;

		hasListeners: <Event extends keyof ThemeEvents<Themes>>(event: Event) => boolean;
		emit: <Event extends keyof ThemeEvents<Themes>>(event: Event, data: ThemeEvents<Themes>[Event]) => Promise<void>;
	}>;
}

export type ThemesOf<M> = M extends ThemeManager<infer T> ? keyof T : never;

const UNAVAILABLE_THEME_RETRY_THRESHOLD_MS = 5 * 60 * 1000;

function validateRequestedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	requestedTheme: keyof Themes,
): Result<void, ThemeManagerError> {
	if (!themeManager.themeIds.includes(requestedTheme))
		return err(ThemeManagerError.themeNotFound(requestedTheme.toString()));

	const unavailableSince = themeManager.unavailableThemes[requestedTheme];

	if (unavailableSince)
		if (Date.now() - unavailableSince > UNAVAILABLE_THEME_RETRY_THRESHOLD_MS)
			delete themeManager.unavailableThemes[requestedTheme];
		else return err(ThemeManagerError.themeUnavailable(requestedTheme.toString()));

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
	if (theme.css && !theme.css.src.trim()) return err(ThemeManagerError.themeInvalidCssSrc(theme.css.src));
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

type CreateThemeManagerInput<Themes extends ThemesRecord> = Omit<
	ThemeManager<Themes>,
	| "themeIds"
	| "resolvedSystemThemes"
	| "resolvedUseSystemTheme"
	| "resolvedTheme"
	| "selectedTheme"
	| "setForcedTheme"
	| "setTheme"
	| "attributes"
	| "on"
	| typeof INTERNAL
> &
	Partial<Pick<ThemeManager<Themes>, "attributes">>;

export function createThemeManager<const Themes extends ThemesRecord>({
	themes,

	enableSystemThemes = true,
	systemTheme,
	systemThemes,
	useSystemTheme = true,

	initialTheme,
	forcedTheme,

	useColorScheme = true,
	useThemeColor = true,
	isThemeForcedAttribute = "data-is-theme-forced",
	isSystemThemeAttribute = "data-is-system-theme",

	storage = DEFAULT_STORAGE_HYBRID,
	enableTabSync = true,

	attributes = ["class", "data-theme"],
}: CreateThemeManagerInput<Themes>): Result<ThemeManager<Themes>, ThemeManagerError[]> {
	const state = $state({
		useSystemTheme,
		selectedTheme: initialTheme,
		previouslyAppliedTheme: initialTheme,
		unavailableThemes: {} as Partial<Record<keyof Themes, number>>,
		systemTheme,
		isForcedThemeLocked: false,
		forcedTheme,
	});

	const themeIds = Object.keys(themes) as (keyof Themes)[];
	const resolvedSystemThemes = resolveSystemThemes(themes, systemThemes);

	const resolvedUseSystemTheme = $derived(
		enableSystemThemes && ((!state.forcedTheme && state.useSystemTheme) || state.forcedTheme === "system"),
	);

	const resolvedTheme = $derived.by(() => {
		const resolvedThemeId =
			resolvedUseSystemTheme && state.systemTheme
				? resolvedSystemThemes[state.systemTheme]
				: (state.forcedTheme ?? state.selectedTheme);

		return themeIds.includes(resolvedThemeId) ? resolvedThemeId : initialTheme;
	});

	const setUseSystemTheme = (useSystemTheme: boolean): Result<void, ThemeManagerError> => {
		if (!themeManager.enableSystemThemes) return err(ThemeManagerError.systemThemesDisabled);

		state.useSystemTheme = useSystemTheme;
		return ok();
	};

	const setSelectedTheme = (theme: keyof Themes) =>
		validateRequestedTheme(themeManager, theme).andTee(() => {
			state.selectedTheme = theme;
		});

	const transitionTheme = (
		to: keyof Themes | "system",
		commit: () => Result<void, ThemeManagerError>,
		shouldPersist = true,
	) => {
		const from = themeManager.resolvedUseSystemTheme ? "system" : themeManager.resolvedTheme;

		if (from === to) return okAsync();

		return ResultAsync.fromPromise(
			(async () => {
				let cancelled = false;

				if (themeManager[INTERNAL].hasListeners("beforeChange")) {
					const beforeEvent: BeforeThemeChangeEvent<Themes> = {
						from,
						to,
						preventDefault: () => {
							cancelled = true;
						},
						get defaultPrevented() {
							return cancelled;
						},
					};

					await themeManager[INTERNAL].emit("beforeChange", beforeEvent);

					if (cancelled) throw ThemeManagerError.cancelled;
				}

				const commitResult = commit();
				if (commitResult.isErr()) throw commitResult.error;

				if (shouldPersist) await persistTheme(themeManager, to);

				if (themeManager[INTERNAL].hasListeners("afterChange")) {
					const afterEvent: AfterThemeChangeEvent<Themes> = {
						from,
						to,
					};

					await themeManager[INTERNAL].emit("afterChange", afterEvent);
				}
			})(),
			(error) => error as ThemeManagerError,
		);
	};

	const setForcedTheme = (theme?: keyof Themes | "system", lock = false) => {
		if (themeManager.isForcedThemeLocked) return errAsync(ThemeManagerError.forcedThemeLocked);
		else themeManager.isForcedThemeLocked = lock;

		if (state.forcedTheme === theme) return okAsync();

		if (theme === "system" && !themeManager.enableSystemThemes) return errAsync(ThemeManagerError.systemThemesDisabled);

		if (!theme) {
			state.forcedTheme = undefined;

			return ResultAsync.fromSafePromise(
				(async () => {
					await themeManager[INTERNAL].emit("unforced", {});
				})(),
			);
		}

		const validationResult = theme === "system" ? ok() : validateRequestedTheme(themeManager, theme);

		return validationResult
			.asyncAndThen(() =>
				transitionTheme(
					theme,
					() => {
						state.forcedTheme = theme;
						return ok();
					},
					false,
				),
			)
			.andThen(() =>
				ResultAsync.fromSafePromise(
					(async () => {
						const forcedEvent: ForcedThemeEvent<Themes> = {
							theme,
						};

						await themeManager[INTERNAL].emit("forced", forcedEvent);
					})(),
				),
			);
	};

	const setTheme = (theme: keyof Themes | "system", shouldPersist = true) => {
		return transitionTheme(
			theme,
			() => {
				if (theme === "system") return setUseSystemTheme(true);
				else return setUseSystemTheme(false).andThen(() => setSelectedTheme(theme));
			},
			shouldPersist,
		);
	};

	const setSystemTheme = async (systemTheme: SystemTheme) => {
		state.systemTheme = systemTheme;

		const changeEvent: SystemThemeChangeEvent<Themes> = {
			systemTheme,
			resolvedSystemTheme: resolvedSystemThemes[systemTheme],
		};

		await themeManager[INTERNAL].emit("systemChange", changeEvent);
	};

	const setPreviouslyAppliedTheme = (theme: keyof Themes) => {
		state.previouslyAppliedTheme = theme;
	};

	const hasLightTheme = !!Object.values(themes).find((theme) => theme.type === "light");
	const hasDarkTheme = !!Object.values(themes).find((theme) => theme.type === "dark");
	const hasLightSystemTheme = themeIds.includes(resolvedSystemThemes.light);
	const hasDarkSystemTheme = themeIds.includes(resolvedSystemThemes.dark);

	type Events = ThemeEvents<Themes>;

	const listeners: Partial<{ [Event in keyof Events]: Set<Listener<Events[Event]>> }> = {};

	const on = <Event extends keyof Events>(event: Event, handler: Listener<Events[Event]>) => {
		const scopedListeners = listeners as Partial<Record<Event, Set<Listener<Events[Event]>>>>;
		if (!(event in listeners)) scopedListeners[event] = new Set();

		listeners[event]?.add(handler);

		return () => listeners[event]?.delete(handler);
	};

	const emit = async <Event extends keyof Events>(event: Event, data: Events[Event]) => {
		const handlers = listeners[event];
		if (!handlers) return;

		for (const handler of handlers) {
			await handler(data);
		}
	};

	const hasListeners = <Event extends keyof Events>(event: Event) => event in listeners;

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

		get resolvedUseSystemTheme() {
			return resolvedUseSystemTheme;
		},

		hasLightTheme,
		hasDarkTheme,
		hasLightSystemTheme,
		hasDarkSystemTheme,

		initialTheme,

		get resolvedTheme() {
			return resolvedTheme;
		},

		get selectedTheme() {
			return state.selectedTheme;
		},

		get isForcedThemeLocked() {
			return state.isForcedThemeLocked;
		},

		set isForcedThemeLocked(value) {
			state.isForcedThemeLocked = value;
		},

		get forcedTheme() {
			return state.forcedTheme;
		},

		get previouslyAppliedTheme() {
			return state.previouslyAppliedTheme;
		},

		get unavailableThemes() {
			return state.unavailableThemes;
		},

		setForcedTheme,
		setTheme,

		useColorScheme,
		useThemeColor,

		isThemeForcedAttribute,
		isSystemThemeAttribute,

		storage,
		enableTabSync,

		attributes,

		on,

		[INTERNAL]: {
			setSystemTheme,
			setUseSystemTheme,

			setSelectedTheme,
			setPreviouslyAppliedTheme,

			hasListeners,
			emit,
		},
	};

	return validateThemeManager(themeManager).map(() => {
		Object.freeze(themeManager[INTERNAL]);
		return Object.freeze(themeManager);
	});
}

function updateMetaTags<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
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

function unloadStaleThemes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	Object.values(themeManager.themes)
		.filter(isThemeWithCss)
		.filter((theme) => theme.id !== themeManager.resolvedTheme && theme.css.lazyLoading)
		.forEach((theme) => {
			unloadTheme(theme);
		});
}

function cleanUpThemeClasses<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const classesToRemove = themeManager.themeIds
		.filter((themeId) => themeId !== themeManager.resolvedTheme)
		.map((themeId) => themeManager.themes[themeId].className)
		.filter((className) => className !== undefined);

	for (const className of classesToRemove) document.documentElement.classList.remove(className);
}

function updateAttributes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	cleanUpThemeClasses(themeManager);

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
		if (attribute === "class") {
			if (resolvedTheme.className) document.documentElement.classList.add(resolvedTheme.className);
		} else document.documentElement.setAttribute(attribute, themeManager.resolvedTheme.toString());
}

function registerMediaListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!themeManager.enableSystemThemes || !BROWSER) return () => {};

	const media = globalThis.matchMedia("(prefers-color-scheme: dark)");
	const updateSystemTheme = (matches: boolean) => themeManager[INTERNAL].setSystemTheme(matches ? "dark" : "light");

	void updateSystemTheme(media.matches);

	let currentPromise: Promise<void> = Promise.resolve();

	const onChange = (event: MediaQueryListEvent) => {
		currentPromise = currentPromise.then(() => updateSystemTheme(event.matches));
	};

	media.addEventListener("change", onChange);

	return () => {
		media.removeEventListener("change", onChange);
	};
}

function removeThemeFromDom<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const classesToRemove = themeManager.themeIds
		.map((themeId) => themeManager.themes[themeId].className)
		.filter((className) => className !== undefined);

	for (const className of classesToRemove) document.documentElement.classList.remove(className);

	const attributes = themeManager.attributes.filter((attribute) => attribute !== "class");
	for (const attribute of attributes) document.documentElement.removeAttribute(attribute);

	const colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
	if (colorSchemeMetaElement) colorSchemeMetaElement.remove();

	const themeColorMetaElement = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
	if (themeColorMetaElement) themeColorMetaElement.remove();

	document.documentElement.style.removeProperty("color-scheme");
}

function revertOrRemoveThemeFromDom<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	useInitialThemeAsFallback?: boolean,
	shouldLog = false,
) {
	const resolvedTheme = themeManager.resolvedTheme.toString();
	const previousTheme = themeManager.previouslyAppliedTheme;

	const canUsePreviousTheme =
		previousTheme !== undefined &&
		resolvedTheme !== previousTheme &&
		!(previousTheme in themeManager.unavailableThemes);

	const canUseInitialTheme =
		useInitialThemeAsFallback && !(themeManager.initialTheme in themeManager.unavailableThemes);

	const fallbackTheme = canUsePreviousTheme
		? previousTheme
		: canUseInitialTheme
			? themeManager.initialTheme
			: undefined;

	if (fallbackTheme) {
		if (themeManager.forcedTheme === resolvedTheme) {
			if (shouldLog) console.info(`Removing forced theme.`);
			themeManager.setForcedTheme(undefined);
		}

		if (shouldLog) console.info(`Reverting to previous theme: ${fallbackTheme.toString()}`);
		themeManager.setTheme(fallbackTheme);

		return;
	}

	if (!BROWSER) return;

	if (shouldLog) console.info("Removing theme from DOM.");

	removeThemeFromDom(themeManager);
}

async function loadThemeAndUpdateDom<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

	try {
		await preloadTheme(resolvedTheme);
		await loadTheme(resolvedTheme);
	} catch (error) {
		console.error(`Failed to load theme '${resolvedTheme.id}'.`);

		themeManager.unavailableThemes[themeManager.resolvedTheme] = Date.now();
		revertOrRemoveThemeFromDom(themeManager, true, true);

		if (!themeManager[INTERNAL].hasListeners("loadError")) return;

		const resolvedError = error instanceof Error ? error : new Error(String(error));
		const errorEvent: ThemeLoadErrorEvent<Themes> = {
			theme: resolvedTheme.id,
			error: resolvedError,
		};

		await themeManager[INTERNAL].emit("loadError", errorEvent);

		return;
	}

	unloadStaleThemes(themeManager);
	updateMetaTags(themeManager);
	updateAttributes(themeManager);

	themeManager[INTERNAL].setPreviouslyAppliedTheme(resolvedTheme.id);
}

export async function getPersistedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	config?: {
		serverSideOnly?: boolean;
		syncOnMiss?: boolean;
		fixErrors?: boolean;
		errorOnMiss?: boolean;
		cookies?: Cookies;
	},
) {
	if (!themeManager.storage) return;
	const persistedThemes: Map<StorageMethod, string> = new Map();

	const sortedStorageMethods = themeManager.storage.methods.toSorted(
		(a, b) => (STORAGE_METHOD_PRIORITY.get(b) ?? Infinity) - (STORAGE_METHOD_PRIORITY.get(a) ?? Infinity),
	);

	let dominantTheme: string | undefined;

	for (const storageMethod of sortedStorageMethods) {
		const isLocalStorage = storageMethod === "localStorage";
		const isSessionStorage = storageMethod === "sessionStorage";
		const isCookie = storageMethod === "cookie";

		if (BROWSER && isLocalStorage && !config?.serverSideOnly) {
			const storedTheme = localStorage.getItem(themeManager.storage.key);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from local storage. ${config?.syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme = storedTheme ?? dominantTheme;
		} else if (!BROWSER && isLocalStorage && !config?.serverSideOnly)
			console.error(`Tried to get theme from local storage from a non-browser context. Skipping.`);
		else if (BROWSER && isSessionStorage && !config?.serverSideOnly) {
			const storedTheme = sessionStorage.getItem(themeManager.storage.key);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from session storage. ${config?.syncOnMiss ? "Marking as desynced." : "Skipping."}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme = storedTheme ?? dominantTheme;
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
			dominantTheme = storedTheme ?? dominantTheme;
		}
	}

	if (dominantTheme && dominantTheme !== "system" && !themeManager.themeIds.includes(dominantTheme)) {
		if (config?.fixErrors) await persistTheme(themeManager, themeManager.selectedTheme, config?.cookies);
		return undefined;
	}

	if (config?.syncOnMiss && dominantTheme) {
		const activeMethods: StorageMethod[] = config?.serverSideOnly ? ["cookie"] : themeManager.storage.methods;
		const missingAny = activeMethods.some((storageMethod) => !persistedThemes.has(storageMethod));

		if (missingAny) await persistTheme(themeManager, dominantTheme, config?.cookies);
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

	const themeId = theme.toString();

	if (BROWSER && useLocalStorage) localStorage.setItem(themeManager.storage.key, themeId);
	else if (!BROWSER && useLocalStorage)
		console.error(`Tried to save theme '${themeId}' to local storage in a non-browser context. Skipping.`);

	if (BROWSER && useSessionStorage) sessionStorage.setItem(themeManager.storage.key, themeId);
	else if (!BROWSER && useSessionStorage)
		console.error(`Tried to save theme '${themeId}' to session storage in a non-browser context. Skipping.`);

	if (useCookie) await setCookie(themeId, themeManager.storage.cookie, cookies);
}

function registerStorageListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER || !themeManager.storage || !themeManager.enableTabSync) return () => {};

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");

	if (!useLocalStorage && !useSessionStorage) return () => {};

	const onStorage = (event: StorageEvent) => {
		const isThemeKey = event.key === themeManager.storage?.key;
		if (!isThemeKey) return;

		const isLocalStorage = event.storageArea === localStorage;
		const isSessionStorage = event.storageArea === sessionStorage;

		if ((useLocalStorage && isLocalStorage) || (useSessionStorage && isSessionStorage)) {
			const storageTheme = event.newValue as keyof Themes | "system";

			if (
				(storageTheme !== "system" && !themeManager.themeIds.includes(storageTheme)) ||
				(storageTheme === "system" && themeManager.resolvedUseSystemTheme) ||
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
	$effect.pre(() => {
		const removeStorageListener = registerStorageListener(themeManager);
		const removeMediaListener = registerMediaListener(themeManager);

		getPersistedTheme(themeManager).then((persistedTheme) => {
			if (persistedTheme) themeManager.setTheme(persistedTheme, false);
		});

		return () => {
			removeStorageListener();
			removeMediaListener();
		};
	});

	let currentSetForcedThemePromise = Promise.resolve();

	$effect.pre(() => {
		const dominantForcedTheme = forceThemeRegistry.dominantForcedTheme;

		untrack(() => {
			if (themeManager.forcedTheme !== dominantForcedTheme)
				currentSetForcedThemePromise = currentSetForcedThemePromise.then(async () => {
					const result = await themeManager.setForcedTheme(dominantForcedTheme as keyof Themes | "system" | undefined);
					if (result.isErr()) console.error(getErrorMessage(result.error));
				});
		});
	});

	let currentLoadThemePromise = Promise.resolve();

	$effect.pre(() => {
		themeManager.resolvedTheme;
		themeManager.resolvedUseSystemTheme;

		currentLoadThemePromise = currentLoadThemePromise.then(async () => {
			await loadThemeAndUpdateDom(themeManager);
		});
	});
}
