import { BROWSER } from "esm-env";

export type ThemeAttribute = "class" | `data-${string}`;

export interface Theme {
	id: string;
	className?: string;
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

export function getCssLinks(theme: Theme, preload = true) {
	const src = theme.css?.src && encodeURI(theme.css?.src);

	if (!src) return;

	const links = [`<link rel="stylesheet" href="${src}" />`];
	if (preload) links.push(`<link rel="preload" href="${src}" as="style" />`);

	return links;
}

export function unloadTheme(theme: Theme) {
	if (!BROWSER || !hasCss(theme)) return;

	document
		.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="style"],link[rel="stylesheet"]')
		.values()
		.filter((linkElement) => theme.css.src === (linkElement.getAttribute("href") ?? ""))
		.forEach((linkElement) => {
			linkElement.remove();
		});
}

export function preloadTheme(theme: Theme) {
	if (!BROWSER || !hasCss(theme)) return;

	const source = encodeURI(theme.css.src);

	let preloadLinkElement = document.querySelector<HTMLLinkElement>(`link[rel="preload"][as="style"][href="${source}"]`);

	if (!preloadLinkElement) {
		preloadLinkElement = document.createElement("link");
		preloadLinkElement.rel = "preload";
		preloadLinkElement.as = "style";
		preloadLinkElement.href = source;

		document.head.appendChild(preloadLinkElement);
	}
}

export function loadTheme(theme: Theme): Promise<void> {
	if (!BROWSER || !hasCss(theme)) return Promise.resolve();

	const source = encodeURI(theme.css.src);

	return new Promise((resolve, reject) => {
		let stylesheetLinkElement = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${source}"]`);

		if (stylesheetLinkElement) {
			if (stylesheetLinkElement.sheet) {
				resolve();
				return;
			}

			stylesheetLinkElement.onerror = reject;
			stylesheetLinkElement.onload = () => {
				resolve();
			};
		} else {
			stylesheetLinkElement = document.createElement("link");
			stylesheetLinkElement.rel = "stylesheet";
			stylesheetLinkElement.href = source;

			stylesheetLinkElement.onerror = reject;
			stylesheetLinkElement.onload = () => {
				resolve();
			};

			document.head.appendChild(stylesheetLinkElement);
			return;
		}
	});
}
