import type { ThemeRecord } from "../theme/theme.js";
import type { SystemTheme } from "./themeManager.js";

export interface ThemeChangeEvent<Themes extends ThemeRecord> {
	readonly from: keyof Themes | "system";
	readonly to: keyof Themes | "system";
}

export type AfterThemeChangeEvent<Themes extends ThemeRecord> = ThemeChangeEvent<Themes>;

export interface BeforeThemeChangeEvent<Themes extends ThemeRecord> extends ThemeChangeEvent<Themes> {
	readonly preventDefault: () => void;
	readonly defaultPrevented: boolean;
}

export interface ThemeSelectEvent<Themes extends ThemeRecord> extends ThemeChangeEvent<Themes> {
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
	select: ThemeSelectEvent<Themes>;
	systemChange: SystemThemeChangeEvent<Themes>;
	forced: ForcedThemeEvent<Themes>;
	unforced: UnforcedThemeEvent;
};

export type Listener<Data> = (data: Data) => void | Promise<void>;
