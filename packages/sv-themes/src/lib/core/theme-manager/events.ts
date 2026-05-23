// v8 ignore file

import type { ThemeRecord } from "$lib/index.js";
import type { SystemTheme } from "./theme-manager.js";

export interface ThemeChangeEvent<Themes extends ThemeRecord> {
	readonly from: keyof Themes | "system";
	readonly to: keyof Themes | "system";
}

export type AfterThemeChangeEvent<Themes extends ThemeRecord> = ThemeChangeEvent<Themes>;

export interface BeforeThemeChangeEvent<Themes extends ThemeRecord> extends ThemeChangeEvent<Themes> {
	readonly preventDefault: () => void;
	readonly defaultPrevented: boolean;
}

export interface SystemThemeChangeEvent<Themes extends ThemeRecord> {
	readonly systemTheme: SystemTheme;
	readonly resolvedSystemTheme: keyof Themes;
}

export interface ForcedThemeEvent<Themes extends ThemeRecord> {
	readonly theme: keyof Themes | "system";
}

export type UnforcedThemeEvent = NonNullable<unknown>;

export type ThemeManagerEvents<Themes extends ThemeRecord> = {
	beforeChange: BeforeThemeChangeEvent<Themes>;
	afterChange: AfterThemeChangeEvent<Themes>;
	systemChange: SystemThemeChangeEvent<Themes>;
	forced: ForcedThemeEvent<Themes>;
	unforced: UnforcedThemeEvent;
};

export type Listener<Data> = (data: Data) => void | Promise<void>;
