import type { ThemesRecord } from "./theme.js";
import type { SystemTheme } from "./theme-manager.svelte.js";

export interface ThemeChangeEvent<Themes extends ThemesRecord> {
	readonly from: keyof Themes | "system";
	readonly to: keyof Themes | "system";
}

export type AfterThemeChangeEvent<Themes extends ThemesRecord> = ThemeChangeEvent<Themes>;

export interface BeforeThemeChangeEvent<Themes extends ThemesRecord> extends ThemeChangeEvent<Themes> {
	readonly preventDefault: () => void;
	readonly defaultPrevented: boolean;
}

export interface SystemThemeChangeEvent<Themes extends ThemesRecord> {
	readonly systemTheme: SystemTheme;
	readonly resolvedSystemTheme: keyof Themes;
}

export interface ForcedThemeEvent<Themes extends ThemesRecord> {
	readonly theme: keyof Themes | "system";
}

export type UnforcedThemeEvent = NonNullable<unknown>;

export type ThemeEvents<Themes extends ThemesRecord> = {
	beforeChange: BeforeThemeChangeEvent<Themes>;
	afterChange: AfterThemeChangeEvent<Themes>;
	systemChange: SystemThemeChangeEvent<Themes>;
	forced: ForcedThemeEvent<Themes>;
	unforced: UnforcedThemeEvent;
};

export type Listener<Data> = (data: Data) => void | Promise<void>;
