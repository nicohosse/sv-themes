import { err, errAsync, ok, okAsync, type Result, ResultAsync } from "neverthrow";
import type { ThemeRecord } from "$lib/index.js";
import { ThemeManagerError } from "./errors.js";
import type {
	AfterThemeChangeEvent,
	BeforeThemeChangeEvent,
	ForcedThemeEvent,
	Listener,
	SystemThemeChangeEvent,
	ThemeManagerEvents,
} from "./events.js";
import { persistTheme } from "./persistence.js";
import { resolveThemeManagerConfig } from "./resolver.js";
import {
	type SystemTheme,
	type SystemThemes,
	INTERNAL as THEME_MANAGER_INTERNAL,
	type ThemeManager,
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
	| "resolvedUseSystemTheme"
	| "hasLightTheme"
	| "hasDarkTheme"
	| "resolvedTheme"
	| "selectedTheme"
	| "setForcedTheme"
	| "setTheme"
	| "attributes"
	| "on"
	| typeof THEME_MANAGER_INTERNAL
> & {
	systemThemes?: SystemThemesConfig<Themes>;
} & Partial<Pick<ThemeManager<Themes>, "attributes">>;

export function createThemeManager<const Themes extends ThemeRecord>(
	config: ThemeManagerConfig<Themes>,
): Result<ThemeManager<Themes>, ThemeManagerError[]> {
	const resolveResult = resolveThemeManagerConfig(config);
	if (resolveResult.isErr()) return err(resolveResult.error);

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
		resolvedUseSystemTheme && resolvedConfig.systemThemes.kind === "enabled" && state.systemTheme
			? resolvedConfig.systemThemes.mappings[state.systemTheme]
			: (state.forcedTheme ?? state.selectedTheme),
	);

	const setUseSystemTheme = (useSystemTheme: boolean): Result<void, ThemeManagerError> => {
		if (useSystemTheme && themeManager.systemThemes.kind === "disabled")
			return err(ThemeManagerError.systemThemesDisabled);

		state.useSystemTheme = useSystemTheme;
		return ok();
	};

	const setSelectedTheme = (theme: keyof Themes) =>
		validateRequestedTheme(themeManager.themes, theme).andTee(() => {
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

				if (themeManager[THEME_MANAGER_INTERNAL].hasListeners("beforeChange")) {
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

				const commitResult = commit();
				if (commitResult.isErr()) throw commitResult.error;

				if (shouldPersist) await persistTheme(themeManager, to);

				if (themeManager[THEME_MANAGER_INTERNAL].hasListeners("afterChange")) {
					const afterEvent: AfterThemeChangeEvent<Themes> = {
						from,
						to,
					};

					await themeManager[THEME_MANAGER_INTERNAL].emit("afterChange", afterEvent);
				}
			})(),
			(error) => error as ThemeManagerError,
		);
	};

	const setForcedTheme = (theme?: keyof Themes | "system", shouldLock = false) => {
		if (themeManager.isForcedThemeLocked) return errAsync(ThemeManagerError.forcedThemeLocked);
		else themeManager.isForcedThemeLocked = shouldLock;

		if (state.forcedTheme === theme) return okAsync();

		if (theme === "system" && themeManager.systemThemes.kind === "disabled")
			return errAsync(ThemeManagerError.systemThemesDisabled);

		if (!theme) {
			state.forcedTheme = undefined;

			return ResultAsync.fromSafePromise(
				(async () => {
					await themeManager[THEME_MANAGER_INTERNAL].emit("unforced", {});
				})(),
			);
		}

		const validationResult = theme === "system" ? ok() : validateRequestedTheme(themeManager.themes, theme);

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

						await themeManager[THEME_MANAGER_INTERNAL].emit("forced", forcedEvent);
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

		useColorScheme: resolvedConfig.useColorScheme,
		useThemeColor: resolvedConfig.useThemeColor,

		isThemeForcedAttribute: resolvedConfig.isThemeForcedAttribute,
		isSystemThemeAttribute: resolvedConfig.isSystemThemeAttribute,

		storage: resolvedConfig.storage,
		enableTabSync: resolvedConfig.enableTabSync,

		attributes: resolvedConfig.attributes,

		on,

		[THEME_MANAGER_INTERNAL]: {
			setSystemTheme,
			setUseSystemTheme,

			setSelectedTheme,

			hasListeners,
			emit,
		},
	};

	Object.freeze(themeManager.systemThemes);
	Object.freeze(themeManager[THEME_MANAGER_INTERNAL]);

	return ok(Object.freeze(themeManager));
}
