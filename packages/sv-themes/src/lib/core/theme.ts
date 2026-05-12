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

export function isThemeWithCss(theme: Theme): theme is Theme & { css: { src: string } } {
	return !!theme.css;
}

export function getThemeCssLinks(theme: Theme, preload = true, media?: string) {
	const src = theme.css?.src && encodeURI(theme.css?.src);

	if (!src) return;

	const links = [
		`<link rel="stylesheet" href="${src}"${media ? ` media="${media}"` : " "} onload="this.dataset.loaded='true' onerror="this.dataset.errored='true'/>`,
	];

	if (preload)
		links.push(
			`<link rel="preload" href="${src}" as="style"${media ? ` media="${media}"` : " "} onload="this.dataset.loaded='true' onerror="this.dataset.errored='true'/>`,
		);

	return links;
}

export function unloadTheme(theme: Theme) {
	if (!BROWSER || !isThemeWithCss(theme)) return;

	document
		.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="style"],link[rel="stylesheet"]')
		.values()
		.filter((linkElement) => theme.css.src === linkElement.getAttribute("href"))
		.forEach((linkElement) => {
			linkElement.remove();
		});
}

export async function preloadTheme(theme: Theme): Promise<void> {
	if (!BROWSER || !isThemeWithCss(theme)) return Promise.resolve();

	const source = encodeURI(theme.css.src);

	return new Promise((resolve, reject) => {
		let preloadLinkElement = document.querySelector<HTMLLinkElement>(
			`link[rel="preload"][as="style"][href="${source}"]`,
		);

		const isNew = !preloadLinkElement;

		if (!preloadLinkElement) {
			preloadLinkElement = document.createElement("link");
			preloadLinkElement.rel = "preload";
			preloadLinkElement.as = "style";
			preloadLinkElement.href = source;
		}

		const done = () => {
			preloadLinkElement.dataset.loaded = "true";
			resolve();
		};

		preloadLinkElement.onload = done;

		preloadLinkElement.onerror = () => {
			preloadLinkElement.dataset.errored = "true";
			reject();
		};

		if (isNew) document.head.appendChild(preloadLinkElement);

		if (preloadLinkElement.dataset.errored) reject();
		if (preloadLinkElement.dataset.loaded) done();
	});
}

export function loadTheme(theme: Theme): Promise<void> {
	if (!BROWSER || !isThemeWithCss(theme)) return Promise.resolve();

	const source = encodeURI(theme.css.src);

	const preloadLinkElement = document.querySelector<HTMLLinkElement>(
		`link[rel="preload"][as="style"][href="${source}"]`,
	);

	return new Promise((resolve, reject) => {
		let stylesheetLinkElement = document.querySelector<HTMLLinkElement>(`link[rel="stylesheet"][href="${source}"]`);
		const isNew = !stylesheetLinkElement;

		if (!stylesheetLinkElement) {
			stylesheetLinkElement = document.createElement("link");
			stylesheetLinkElement.rel = "stylesheet";
			stylesheetLinkElement.href = source;
		}

		const done = () => {
			preloadLinkElement?.remove();
			stylesheetLinkElement.dataset.loaded = "true";
			resolve();
		};

		stylesheetLinkElement.onload = done;
		stylesheetLinkElement.onerror = () => {
			stylesheetLinkElement.dataset.errored = "true";
			reject();
		};

		if (isNew) document.head.appendChild(stylesheetLinkElement);

		if (stylesheetLinkElement.dataset.errored) reject();
		if (stylesheetLinkElement.sheet || stylesheetLinkElement.dataset.loaded) done();
	});
}
