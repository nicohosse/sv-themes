export interface Theme {
	id: string;
	className?: string;
	type: "light" | "dark";
	color?: string;
}

export type ThemeRecord<Keys extends string = string> = Record<Keys, Readonly<Theme>>;

/**
 * @warning Duplicate theme ids are overwritten.
 * If multiple themes share the same `id`, the last theme wins.
 *
 * @returns A theme record from an array of theme
 */
export function createThemes<const Themes extends readonly Theme[]>(themes: Themes): ThemeRecord<Themes[number]["id"]> {
	return Object.fromEntries(themes.map((theme) => [theme.id, theme])) as ThemeRecord<Themes[number]["id"]>;
}

export const DEFAULT_THEMES = createThemes([
	{ id: "light", type: "light", color: "#fff" },
	{ id: "dark", type: "dark", color: "#000" },
]);
