import type { Result, ResultAsync } from "neverthrow";
import type { ThemeRecord } from "$lib/index.js";
import type { CookieOptions } from "$lib/utils/cookie.js";
import type { ThemeManagerError } from "./errors.js";
import type { Listener, ThemeManagerEvents } from "./events.js";

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

export interface ThemeManager<Themes extends ThemeRecord = ThemeRecord> {
	readonly themes: Themes;
	readonly themeIds: (keyof Themes)[];

	readonly systemThemes: SystemThemes<Themes>;
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

	readonly on: <Event extends keyof ThemeManagerEvents<Themes>>(
		event: Event,
		handler: Listener<ThemeManagerEvents<Themes>[Event]>,
	) => () => void;

	[INTERNAL]: Readonly<{
		setSystemTheme: (systemTheme: SystemTheme) => ResultAsync<void, ThemeManagerError>;
		setUseSystemTheme: (useSystemTheme: boolean) => Result<void, ThemeManagerError>;

		setSelectedTheme: (theme: keyof Themes) => Result<void, ThemeManagerError>;

		hasListeners: <Event extends keyof ThemeManagerEvents<Themes>>(event: Event) => boolean;
		emit: <Event extends keyof ThemeManagerEvents<Themes>>(
			event: Event,
			data: ThemeManagerEvents<Themes>[Event],
		) => Promise<void>;
	}>;
}

export type ThemesOf<M> = M extends ThemeManager<infer T> ? keyof T : never;
