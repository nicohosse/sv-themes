export type ThemeAttribute = "class" | `data-${string}`;

export interface Theme {
	id: string;
	type: "light" | "dark";
	color?: string;
	css?: {
		src: string;
		lazyLoading?: boolean;
	};
}

export type ThemesRecord<Keys extends string = string> = Record<Keys, Readonly<Theme>>;

export function hasCss(theme: Theme): theme is Theme & { css: { src: string } } {
	return !!theme.css;
}

export function getCssLink(theme: Theme) {
	const src = theme.css?.src && encodeURI(theme.css?.src);
	return src && `<link rel="stylesheet" href="${src}" />`;
}
