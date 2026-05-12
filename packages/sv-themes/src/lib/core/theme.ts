export type ThemeAttribute = "class" | `data-${string}`;

export interface Theme {
	id: string;
	className?: string;
	type: "light" | "dark";
	color?: string;
}

export type ThemesRecord<Keys extends string = string> = Record<Keys, Readonly<Theme>>;
