import { err, ok, type Result } from "neverthrow";
import { ThemeError } from "./errors.js";

export interface Theme {
	id: string;
	className?: string;
	type: "light" | "dark";
	color?: string;
}

export type ThemeRecord<Keys extends string = string> = Record<Keys, Readonly<Theme>>;

export function createThemes<const Themes extends readonly Theme[]>(
	themes: Themes,
): Result<ThemeRecord<Themes[number]["id"]>, ThemeError[]> {
	const seen = new Set<string>();
	const duplicates: string[] = [];

	for (const theme of themes)
		if (seen.has(theme.id)) duplicates.push(theme.id);
		else seen.add(theme.id);

	if (seen.size === 0) return err([ThemeError.noThemes]);

	if (duplicates.length > 0) return err(duplicates.map((duplicateTheme) => ThemeError.duplicateTheme(duplicateTheme)));

	return ok(Object.fromEntries(themes.map((theme) => [theme.id, theme])) as ThemeRecord<Themes[number]["id"]>);
}

export const DEFAULT_THEMES = createThemes([
	{ id: "light", type: "light", color: "#fff" },
	{ id: "dark", type: "dark", color: "#000" },
]).match(
	(themes) => themes,
	// v8 ignore next
	(errors) => {
		throw new Error(`Failed to create themes: ${JSON.stringify(errors.map((error) => error.message))}`);
	},
);
