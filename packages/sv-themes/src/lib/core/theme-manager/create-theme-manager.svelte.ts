import { err, errAsync, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import { getThemeManager, setThemeManager } from "$lib/contexts/theme-manager-context.svelte.js";
import type { ThemeRecord } from "$lib/index.js";
import { registerThemeManager } from "./dom.svelte.js";
import { ThemeManagerError } from "./errors.js";
import type {
	AfterThemeChangeEvent,
	BeforeThemeChangeEvent,
	ForcedThemeEvent,
	Listener,
	SystemThemeChangeEvent,
	ThemeManagerEvents,
	ThemeSelectEvent,
} from "./events.js";
import { createForceThemeRegistry } from "./force-theme-registry.svelte.js";
import { persistTheme } from "./persistence.js";
import { resolveThemeManagerConfig } from "./resolver.js";
import {
	type SystemTheme,
	type SystemThemes,
	INTERNAL as THEME_MANAGER_INTERNAL,
	type ThemeManager,
	type ThemeUpdateConfig,
} from "./theme-manager.js";
import { validateRequestedTheme, validateThemeManagerConfig } from "./validators.js";

export type SystemThemesConfig<Themes extends ThemeRecord> =
	SystemThemes<Themes> extends infer T
		? T extends { kind: "enabled" }
			? {
					kind: "enabled";
					mappings?: Partial<Record<SystemTheme, keyof Themes>>;
				}
			: T
		: never;

export type ThemeManagerConfig<Themes extends ThemeRecord = ThemeRecord> = Omit<
	ThemeManager<Themes>,
	| "themeIds"
	| "systemThemes"
	| "useSystemTheme"
	| "resolvedUseSystemTheme"
	| "hasLightTheme"
	| "hasDarkTheme"
	| "resolvedTheme"
	| "selectedTheme"
	| "isForcedThemeLocked"
	| "setForcedTheme"
	| "setTheme"
	| "setUseSystemTheme"
	| "setSelectedTheme"
	| "useColorScheme"
	| "useThemeColor"
	| "enableTabSync"
	| "attributes"
	| "enableLogging"
	| "on"
	| typeof THEME_MANAGER_INTERNAL
> & {
	systemThemes?: SystemThemesConfig<Themes>;
} & Partial<
		Pick<
			ThemeManager<Themes>,
			| "useSystemTheme"
			| "isForcedThemeLocked"
			| "useColorScheme"
			| "useThemeColor"
			| "enableTabSync"
			| "attributes"
			| "enableLogging"
		>
	>;

/**
 * Instantiates and validates the reactive theme manager state.
 *
 * @param config - Initial configuration.
 * @returns A `Result` containing the active `ThemeManager` or a list of validation errors.
 */
export function createThemeManager<const Themes extends ThemeRecord>(
	config: ThemeManagerConfig<Themes>,
): Result<ThemeManager<Themes>, ThemeManagerError[]> {
	const resolveResult = resolveThemeManagerConfig(config);
	if (resolveResult.isErr()) return err([resolveResult.error]);

	const resolvedConfig = resolveResult.value;

	const validateResult = validateThemeManagerConfig(resolvedConfig);
	if (validateResult.isErr()) return err(validateResult.error);

	const themeIds = Object.keys(resolvedConfig.themes) as (keyof Themes)[];

	const state = $state({
		useSystemTheme: resolvedConfig.useSystemTheme,
		selectedTheme: resolvedConfig.initialTheme,
		systemTheme: undefined as SystemTheme | undefined,
		isForcedThemeLocked: resolvedConfig.isForcedThemeLocked,
		forcedTheme: resolvedConfig.forcedTheme,
	});

	const resolvedUseSystemTheme = $derived(
		resolvedConfig.systemThemes.kind === "enabled" &&
			((!state.forcedTheme && state.useSystemTheme) || state.forcedTheme === "system"),
	);

	const resolvedTheme = $derived(
		resolvedUseSystemTheme && resolvedConfig.systemThemes.kind === "enabled"
			? resolvedConfig.systemThemes.mappings[state.systemTheme ?? "light"]
			: ((state.forcedTheme === "system" ? undefined : state.forcedTheme) ?? state.selectedTheme),
	);

	const setUseSystemTheme = (
		useSystemTheme: boolean,
		config: ThemeUpdateConfig = {},
	): ResultAsync<void, ThemeManagerError> => {
		if (useSystemTheme === themeManager.useSystemTheme) return okAsync();

		const { shouldPersist = true, ignoreForcedTheme, shouldEmitTransitionEvents = true } = config;

		if (!ignoreForcedTheme && themeManager.forcedTheme) return errAsync(ThemeManagerError.forcedThemeActive);

		const to = useSystemTheme ? "system" : themeManager.selectedTheme;

		const validationResult = validateRequestedTheme(themeManager, to);

		return validationResult
			.asyncAndThen(() =>
				ResultAsync.fromPromise(
					(async () => {
						if (themeManager[THEME_MANAGER_INTERNAL].hasListeners("select")) {
							let cancelled = false;

							const from = themeManager.useSystemTheme ? "system" : themeManager.selectedTheme;

							const selectEvent: ThemeSelectEvent<Themes> = {
								from,
								to,
								preventDefault: () => {
									cancelled = true;
								},
								get defaultPrevented() {
									return cancelled;
								},
							};

							await themeManager[THEME_MANAGER_INTERNAL].emit("select", selectEvent);

							if (cancelled) throw ThemeManagerError.cancelled;
						}
					})(),
					() => ThemeManagerError.cancelled,
				),
			)
			.andThen(() =>
				transitionTheme(
					to,
					() => {
						state.useSystemTheme = useSystemTheme;
						return ok();
					},
					shouldPersist,
					!themeManager.forcedTheme && shouldEmitTransitionEvents,
				),
			);
	};

	const setSelectedTheme = (
		theme: keyof Themes,
		config: ThemeUpdateConfig = {},
	): ResultAsync<void, ThemeManagerError> => {
		const { shouldPersist = true, ignoreForcedTheme, shouldEmitTransitionEvents = true } = config;

		if (!ignoreForcedTheme && themeManager.forcedTheme) return errAsync(ThemeManagerError.forcedThemeActive);

		const validationResult = validateRequestedTheme(themeManager, theme);

		return validationResult
			.asyncAndThen(() =>
				ResultAsync.fromPromise(
					(async () => {
						if (themeManager[THEME_MANAGER_INTERNAL].hasListeners("select")) {
							let cancelled = false;

							const from = themeManager.useSystemTheme ? "system" : themeManager.selectedTheme;

							const selectEvent: ThemeSelectEvent<Themes> = {
								from,
								to: theme,
								preventDefault: () => {
									cancelled = true;
								},
								get defaultPrevented() {
									return cancelled;
								},
							};

							await themeManager[THEME_MANAGER_INTERNAL].emit("select", selectEvent);

							if (cancelled) throw ThemeManagerError.cancelled;
						}
					})(),
					() => ThemeManagerError.cancelled,
				),
			)
			.andThen(() =>
				transitionTheme(
					theme,
					() => {
						state.selectedTheme = theme;
						return ok();
					},
					shouldPersist,
					!themeManager.forcedTheme && shouldEmitTransitionEvents,
				),
			);
	};

	const transitionTheme = (
		to: keyof Themes | "system",
		commit?: () => Result<void, ThemeManagerError>,
		shouldPersist = true,
		shouldEmitEvents = true,
	): ResultAsync<void, ThemeManagerError> => {
		const from = themeManager.resolvedUseSystemTheme ? "system" : themeManager.resolvedTheme;

		if (from === to) {
			const commitResult = commit?.();
			if (commitResult?.isErr()) return errAsync(commitResult.error);

			return okAsync();
		}

		const validationResult = validateRequestedTheme(themeManager, to);

		return validationResult.asyncAndThen(() =>
			ResultAsync.fromPromise(
				(async () => {
					if (shouldEmitEvents && themeManager[THEME_MANAGER_INTERNAL].hasListeners("beforeChange")) {
						let cancelled = false;

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

						await themeManager[THEME_MANAGER_INTERNAL].emit("beforeChange", beforeEvent);

						if (cancelled) throw ThemeManagerError.cancelled;
					}

					const commitResult = commit?.();
					if (commitResult?.isErr()) throw commitResult.error;

					if (shouldPersist) await persistTheme(themeManager, to);

					if (shouldEmitEvents && themeManager[THEME_MANAGER_INTERNAL].hasListeners("afterChange")) {
						const afterEvent: AfterThemeChangeEvent<Themes> = {
							from,
							to,
						};

						await themeManager[THEME_MANAGER_INTERNAL].emit("afterChange", afterEvent);
					}
				})(),
				(error) => error as ThemeManagerError,
			),
		);
	};

	const setForcedTheme = (theme?: keyof Themes | "system", shouldLock = false) => {
		if (themeManager.isForcedThemeLocked) return errAsync(ThemeManagerError.forcedThemeLocked);
		else themeManager.isForcedThemeLocked = shouldLock;

		if (state.forcedTheme === theme) return okAsync();

		const to = theme === undefined ? (themeManager.useSystemTheme ? "system" : themeManager.selectedTheme) : theme;

		const validationResult = validateRequestedTheme(themeManager, to);

		return validationResult
			.asyncAndThen(() =>
				transitionTheme(
					to,
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
						if (theme) {
							const forcedEvent: ForcedThemeEvent<Themes> = {
								theme,
							};

							await themeManager[THEME_MANAGER_INTERNAL].emit("forced", forcedEvent);
						} else await themeManager[THEME_MANAGER_INTERNAL].emit("unforced", {});
					})(),
				),
			);
	};

	const setTheme = (
		theme: keyof Themes | "system",
		config: ThemeUpdateConfig = {},
	): ResultAsync<void, ThemeManagerError> => {
		if (theme === "system") return setUseSystemTheme(true, config);
		else return setUseSystemTheme(false, config).andThen(() => setSelectedTheme(theme, config));
	};

	const setSystemTheme = (systemTheme: SystemTheme) => {
		if (themeManager.systemThemes.kind === "disabled") return errAsync(ThemeManagerError.systemThemesDisabled);

		state.systemTheme = systemTheme;

		const changeEvent: SystemThemeChangeEvent<Themes> = {
			systemTheme,
			resolvedSystemTheme: themeManager.systemThemes.mappings[systemTheme],
		};

		return ResultAsync.fromSafePromise(
			(async () => {
				await themeManager[THEME_MANAGER_INTERNAL].emit("systemChange", changeEvent);
			})(),
		);
	};

	const hasLightTheme = !!Object.values(resolvedConfig.themes).find((theme) => theme.type === "light");
	const hasDarkTheme = !!Object.values(resolvedConfig.themes).find((theme) => theme.type === "dark");

	type Events = ThemeManagerEvents<Themes>;

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

	const forceThemeRegistry = createForceThemeRegistry();

	const themeManager: ThemeManager<Themes> = {
		themes: resolvedConfig.themes,
		themeIds,

		systemThemes: {
			...resolvedConfig.systemThemes,
			get systemTheme() {
				return state.systemTheme;
			},
		},

		get useSystemTheme() {
			return state.useSystemTheme;
		},

		get resolvedUseSystemTheme() {
			return resolvedUseSystemTheme;
		},

		hasLightTheme,
		hasDarkTheme,

		initialTheme: resolvedConfig.initialTheme,

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
		setUseSystemTheme,
		setSelectedTheme,

		useColorScheme: resolvedConfig.useColorScheme,
		useThemeColor: resolvedConfig.useThemeColor,

		isThemeForcedAttribute: resolvedConfig.isThemeForcedAttribute,
		isSystemThemeAttribute: resolvedConfig.isSystemThemeAttribute,

		storage: resolvedConfig.storage,
		enableTabSync: resolvedConfig.enableTabSync,

		attributes: resolvedConfig.attributes,

		on,

		enableLogging: resolvedConfig.enableLogging,

		[THEME_MANAGER_INTERNAL]: {
			forceThemeRegistry,

			transitionTheme,

			setSystemTheme,

			hasListeners,
			emit,
		},
	};

	return ok(themeManager);
}

/**
 * Helper that instantiates the theme manager and returns Svelte context and DOM registration functions.
 *
 * @param config - Initial configuration.
 * @returns A `Result` containing the manager, a function to retrieve it via Svelte context, and its registration lifecycle function or a list of validation errors.
 */
export function createAppThemeManager<const Themes extends ThemeRecord>(
	config: ThemeManagerConfig<Themes>,
): Result<
	{
		themeManager: ThemeManager<Themes>;
		getThemeManager: () => ThemeManager<Themes>;
		registerThemeManager: () => Result<void, ThemeManagerError>;
	},
	ThemeManagerError[]
> {
	const themeManagerResult = createThemeManager(config);
	if (themeManagerResult.isErr()) return err(themeManagerResult.error);

	const themeManager = themeManagerResult.value;

	const registerAppThemeManager = (): Result<void, ThemeManagerError> => {
		const contextResult = setThemeManager(themeManager);
		if (contextResult.isErr()) return contextResult;

		registerThemeManager(themeManager);

		return ok();
	};

	return ok({
		themeManager,
		getThemeManager: () => getThemeManager(),
		registerThemeManager: registerAppThemeManager,
	});
}
