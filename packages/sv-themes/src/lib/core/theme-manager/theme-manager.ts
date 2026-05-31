import type { Result, ResultAsync } from "neverthrow";
import type { ThemeRecord } from "$lib/index.js";
import type { CookieOptions } from "$lib/utils/cookie.js";
import type { ThemeManagerError } from "./errors.js";
import type { Listener, ThemeManagerEvents } from "./events.js";
import type { ForceThemeRegistry } from "./force-theme-registry.svelte.js";

export type ThemeAttribute = "class" | `data-${string}`;

export type SystemTheme = "light" | "dark";

const DEFAULT_THEME_COOKIE_OPTIONS: CookieOptions = {
	name: "theme",
} as const;

export type StorageMethod = "localStorage" | "sessionStorage" | "cookie";

export const STORAGE_METHOD_PRIORITY: Record<StorageMethod, number> = {
	sessionStorage: 0,
	localStorage: 1,
	cookie: 2,
} as const;

export const HYBRID_STORAGE_METHODS: StorageMethod[] = ["cookie", "localStorage"] as const;

export interface StorageOptions {
	methods: StorageMethod[];
	key: string;
	cookie: CookieOptions;
}

export const DEFAULT_STORAGE_HYBRID: StorageOptions = {
	methods: HYBRID_STORAGE_METHODS,
	key: "theme",
	cookie: DEFAULT_THEME_COOKIE_OPTIONS,
} as const;

export type SystemThemes<Themes extends ThemeRecord> =
	| {
			kind: "disabled";
	  }
	| {
			kind: "enabled";
			systemTheme?: SystemTheme;
			mappings: Record<SystemTheme, keyof Themes>;
	  };

export const INTERNAL = Symbol("internal");

export interface ThemeUpdateConfig {
	shouldPersist?: boolean;
	ignoreForcedTheme?: boolean;
	shouldEmitTransitionEvents?: boolean;
}

export interface ThemeManager<Themes extends ThemeRecord = ThemeRecord> {
	/**
	 * The canonical record of all themes.
	 */
	readonly themes: Themes;

	/**
	 * An array containing all valid theme IDs.
	 */
	readonly themeIds: (keyof Themes)[];

	/**
	 * The active system theme configuration, detailing whether system OS tracking is enabled and its active state.
	 */
	readonly systemThemes: SystemThemes<Themes>;

	/**
	 * @reactive Getter indicating whether the user's personal preference is configured to follow system OS settings.
	 * This represents the user's persistent choice and is not mutated or lost when a temporary forced theme is active.
	 */
	readonly useSystemTheme: boolean;

	/**
	 * @reactive Derived getter indicating if system preferences are actively shaping the currently rendered theme.
	 * Resolves to true if system themes are enabled and either no theme is forced while `useSystemTheme` is active,
	 * or the temporary `forcedTheme` is explicitly set to `"system"`.
	 */
	readonly resolvedUseSystemTheme: boolean;

	/**
	 * Boolean flag indicating if any registered theme is of type `"light"`.
	 */
	readonly hasLightTheme: boolean;

	/**
	 * Boolean flag indicating if any registered theme is of type `"dark"`.
	 */
	readonly hasDarkTheme: boolean;

	/**
	 * The fallback/default theme ID specified during configuration.
	 */
	readonly initialTheme: keyof Themes;

	/**
	 * @reactive Derived getter containing the active computed theme ID currently rendered and applied to the DOM.
	 * This resolves the hierarchy: Forced Theme > System OS Theme > Selected Theme Preference.
	 */
	readonly resolvedTheme: keyof Themes;

	/**
	 * @reactive Getter containing the user's persistent manual theme preference.
	 * This represents the user's active choice (e.g., when they explicitly select "light" or "dark")
	 * and remains safely preserved in the background even if a temporary forced theme is currently active.
	 */
	readonly selectedTheme: keyof Themes;

	/**
	 * @reactive Getter containing the current temporary forced theme ID, if set.
	 * Forced themes act as overlay overrides and do not overwrite the user's underlying preferences (`selectedTheme` / `useSystemTheme`).
	 */
	readonly forcedTheme?: keyof Themes | "system";

	/**
	 * @reactive Getter/Setter indicating if a layout has locked the forced state against deeper nested overrides.
	 */
	isForcedThemeLocked: boolean;

	/**
	 * Declares a temporary forced theme override.
	 * This temporarily redirects `resolvedTheme` without modifying the user's underlying preferences.
	 *
	 * @param theme - The theme ID to force, `"system"`, or `undefined` to clear the forced state and revert to user preferences.
	 * @param lock - If true, locks the layout hierarchy against deeper sub-route overrides.
	 * @returns A `ResultAsync` indicating success or a `ForcedThemeLocked` error.
	 */
	readonly setForcedTheme: (theme?: keyof Themes | "system", lock?: boolean) => ResultAsync<void, ThemeManagerError>;

	/**
	 * A convenience method that sets the active user theme preference.
	 * This wraps `setUseSystemTheme` and `setSelectedTheme` to update the user's personal choices in a single call.
	 *
	 * @param theme - The target theme ID or `"system"`.
	 * @param config - Optional configuration to bypass persistence, forced checks, or transition events.
	 * @returns A `ResultAsync` indicating success or a transition error.
	 */
	readonly setTheme: (
		theme: keyof Themes | "system",
		config?: ThemeUpdateConfig,
	) => ResultAsync<void, ThemeManagerError>;

	/**
	 * Configures the user's persistent preference to follow system OS theme changes.
	 *
	 * @param useSystemTheme - True to follow system settings, false to use a manually selected theme.
	 * @param config - Optional configuration to bypass persistence, forced checks, or transition events.
	 * @returns A `ResultAsync` indicating success or a `SystemThemesDisabled` error.
	 */
	readonly setUseSystemTheme: (
		useSystemTheme: boolean,
		config?: ThemeUpdateConfig,
	) => ResultAsync<void, ThemeManagerError>;

	/**
	 * Sets the user's persistent manual theme preference.
	 * This updates `selectedTheme` in the background without affecting an active `forcedTheme` override.
	 *
	 * @param theme - The target theme ID.
	 * @param config - Optional configuration to bypass persistence, forced checks, or transition events.
	 * @returns A `ResultAsync` indicating success or a `ThemeNotFound` error.
	 */
	readonly setSelectedTheme: (theme: keyof Themes, config?: ThemeUpdateConfig) => ResultAsync<void, ThemeManagerError>;

	/**
	 * If active, synchronizes the CSS `color-scheme` rule on the root element.
	 * It also automatically manages the `<meta name="color-scheme">` HTML element, dynamically resolving its content
	 * based on the types and order of your registered themes.
	 */
	readonly useColorScheme: boolean;

	/**
	 * If active, dynamically updates the `<meta name="theme-color">` element using the active theme's `color` property.
	 */
	readonly useThemeColor: boolean;

	/**
	 * The custom attribute set on `<html>` when a forced theme is active (e.g., `"data-is-theme-forced"`).
	 */
	readonly isThemeForcedAttribute?: string;

	/**
	 * The custom attribute set on `<html>` when a system theme is active (e.g., `"data-is-system-theme"`).
	 */
	readonly isSystemThemeAttribute?: string;

	/**
	 * Persistence configuration detailing storage methods, keys, and cookie configurations.
	 */
	readonly storage?: StorageOptions;

	/**
	 * Whether cross-tab synchronization via storage events is active.
	 */
	readonly enableTabSync: boolean;

	/**
	 * Array of HTML attributes (e.g., `'class'`, `'data-theme'`) manipulated on the target element.
	 */
	readonly attributes: ThemeAttribute[];

	/**
	 * Registers an event listener on the theme transition lifecycle.
	 *
	 * @param event - The event name to subscribe to.
	 * @param handler - The listener callback function.
	 * @returns An unsubscription/cleanup function to remove the listener.
	 */
	readonly on: <Event extends keyof ThemeManagerEvents<Themes>>(
		event: Event,
		handler: Listener<ThemeManagerEvents<Themes>[Event]>,
	) => () => void;

	/**
	 * Whether debug logging is active.
	 */
	readonly enableLogging: boolean;

	[INTERNAL]: Readonly<{
		forceThemeRegistry: ForceThemeRegistry;

		transitionTheme: (
			to: keyof Themes | "system",
			commit?: () => Result<void, ThemeManagerError>,
			shouldPersist?: boolean,
		) => ResultAsync<void, ThemeManagerError>;

		setSystemTheme: (systemTheme: SystemTheme) => ResultAsync<void, ThemeManagerError>;

		hasListeners: <Event extends keyof ThemeManagerEvents<Themes>>(event: Event) => boolean;
		emit: <Event extends keyof ThemeManagerEvents<Themes>>(
			event: Event,
			data: ThemeManagerEvents<Themes>[Event],
		) => Promise<void>;
	}>;
}

export type ThemesOf<M> = M extends ThemeManager<infer T> ? keyof T : never;
