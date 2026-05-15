import type { Cookies } from "@sveltejs/kit";
import { BROWSER } from "esm-env";
import { err, errAsync, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import { untrack } from "svelte";
import { forceThemeRegistry } from "$lib/contexts/force-theme-requests-context.svelte.js";
import { type CookieOptions, getCookie, setCookie } from "../utils/cookie.js";
import { resolveCssColor } from "../utils/resolve-css-color.js";
import type { Theme, ThemeAttribute, ThemesRecord } from "./theme.js";
import { getErrorMessage, ThemeManagerError } from "./theme-manager.errors.js";
import type {
	AfterThemeChangeEvent,
	BeforeThemeChangeEvent,
	ForcedThemeEvent,
	Listener,
	SystemThemeChangeEvent,
	ThemeEvents,
} from "./theme-manager.events.js";

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

	readonly initialTheme: keyof Themes;
	readonly resolvedTheme: keyof Themes;
	readonly selectedTheme: keyof Themes;
	readonly forcedTheme?: keyof Themes | "system";
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

		hasListeners: <Event extends keyof ThemeEvents<Themes>>(event: Event) => boolean;
		emit: <Event extends keyof ThemeEvents<Themes>>(event: Event, data: ThemeEvents<Themes>[Event]) => Promise<void>;
	}>;
}

export type ThemesOf<M> = M extends ThemeManager<infer T> ? keyof T : never;

export function validateRequestedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	requestedTheme: keyof Themes,
): Result<void, ThemeManagerError> {
	if (!themeManager.themeIds.includes(requestedTheme))
		return err(ThemeManagerError.themeNotFound(requestedTheme.toString()));

	return ok();
}

export function validateSystemTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	systemTheme: SystemTheme,
): Result<void, ThemeManagerError> {
	const hasSystemTheme =
		systemTheme === "light"
			? themeManager.themeIds.includes(themeManager.resolvedSystemThemes.light)
			: themeManager.hasDarkSystemTheme;

	const resolvedSystemThemeId =
		systemTheme === "light" ? themeManager.resolvedSystemThemes.light : themeManager.resolvedSystemThemes.dark;

	if (hasSystemTheme && themeManager.themes[resolvedSystemThemeId].type !== systemTheme)
		return err(ThemeManagerError.systemThemeInvalidType(systemTheme));
	else if (!hasSystemTheme) return err(ThemeManagerError.systemThemeUnassigned(systemTheme));

	return ok();
}

export function validateTheme(theme: Theme): Result<void, ThemeManagerError> {
	if (theme.id === "system" || !theme.id.trim()) return err(ThemeManagerError.themeInvalidId(theme.id));

	return ok();
}

export function validateThemeManager<const Themes extends ThemesRecord>(
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

export function resolveSystemThemes<const Themes extends ThemesRecord>(
	themes: Themes,
	fallbackTheme: keyof Themes,
	systemThemes?: Partial<Record<SystemTheme, keyof Themes>>,
): Record<SystemTheme, keyof Themes> {
	const themeValues = Object.values(themes);
	const firstLightTheme = themeValues.find((theme) => theme.type === "light")?.id;
	const firstDarkTheme = themeValues.find((theme) => theme.type === "dark")?.id;

	return {
		light: systemThemes?.light ?? firstLightTheme ?? fallbackTheme,
		dark: systemThemes?.dark ?? firstDarkTheme ?? fallbackTheme,
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

	enableSystemThemes,
	systemTheme,
	systemThemes,
	useSystemTheme,

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
		systemTheme,
		isForcedThemeLocked: false,
		forcedTheme,
	});

	const themeIds = Object.keys(themes) as (keyof Themes)[];
	const resolvedSystemThemes = resolveSystemThemes(themes, initialTheme, systemThemes);

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
		if (useSystemTheme && !themeManager.enableSystemThemes) return err(ThemeManagerError.systemThemesDisabled);

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

	const hasLightTheme = !!Object.values(themes).find((theme) => theme.type === "light");
	const hasDarkTheme = !!Object.values(themes).find((theme) => theme.type === "dark");

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

			hasListeners,
			emit,
		},
	};

	return validateThemeManager(themeManager).map(() => {
		Object.freeze(themeManager[INTERNAL]);
		return Object.freeze(themeManager);
	});
}

export function updateMetaTags<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
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

export function cleanUpThemeClasses<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER) return;

	const classesToRemove = themeManager.themeIds
		.filter((themeId) => themeId !== themeManager.resolvedTheme)
		.map((themeId) => themeManager.themes[themeId].className)
		.filter((className) => className !== undefined);

	for (const className of classesToRemove) document.documentElement.classList.remove(className);
}

export function updateAttributes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
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

export function registerMediaListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
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

export function updateDom<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	updateMetaTags(themeManager);
	updateAttributes(themeManager);
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
			const storedTheme = globalThis.localStorage.getItem(themeManager.storage.key);

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
			const storedTheme = globalThis.sessionStorage.getItem(themeManager.storage.key);

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

	if (BROWSER && useLocalStorage) globalThis.localStorage.setItem(themeManager.storage.key, themeId);
	else if (!BROWSER && useLocalStorage)
		console.error(`Tried to save theme '${themeId}' to local storage in a non-browser context. Skipping.`);

	if (BROWSER && useSessionStorage) globalThis.sessionStorage.setItem(themeManager.storage.key, themeId);
	else if (!BROWSER && useSessionStorage)
		console.error(`Tried to save theme '${themeId}' to session storage in a non-browser context. Skipping.`);

	if (useCookie) await setCookie(themeId, themeManager.storage.cookie, cookies);
}

export function registerStorageListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!BROWSER || !themeManager.storage || !themeManager.enableTabSync) return () => {};

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");

	if (!useLocalStorage && !useSessionStorage) return () => {};

	const onStorage = (event: StorageEvent) => {
		const isThemeKey = event.key === themeManager.storage?.key;
		if (!isThemeKey) return;

		const isLocalStorage = event.storageArea === globalThis.localStorage;
		const isSessionStorage = event.storageArea === globalThis.sessionStorage;

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
			await updateDom(themeManager);
		});
	});
}
