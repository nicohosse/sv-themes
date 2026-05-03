import type { Handle } from "@sveltejs/kit";
import { getCssLink, hasCss, type Theme, type ThemesRecord } from "./theme.ts";
import { getErrorMessage } from "./theme-manager.errors.ts";
import { getThemeClass, type ThemeManager, validateRequestedTheme } from "./theme-manager.svelte.ts";

export function getSSRAttributes<Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>, theme: Theme) {
	const attributes: Record<string, string> = {};

	for (const attribute of themeManager.attributes) {
		const value = attribute === "class" ? getThemeClass(themeManager, theme.id) : theme.id;
		attributes[attribute] = value;
	}

	if (themeManager.useColorScheme) attributes.style = `color-scheme: ${theme.type};`;

	return attributes;
}

const HTML_TAG_REGEX = /<html([^>]*)>/;

export function createThemeHandle<Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>): Handle {
	return async ({ event, resolve }) => {
		const forcedTheme = event.locals.forcedTheme as keyof Themes | undefined;

		if (forcedTheme) {
			const forcedThemeValidationResult = validateRequestedTheme(themeManager, forcedTheme);
			if (forcedThemeValidationResult.isErr()) throw new Error(getErrorMessage(forcedThemeValidationResult.error));
		}

		const resolvedTheme = themeManager.themes[forcedTheme ?? themeManager.resolvedTheme];

		const eagerlyLoadedThemes = Object.values(themeManager.themes).filter((theme) => !theme.css?.lazyLoading);

		const themesToLoad = [...eagerlyLoadedThemes];
		if (hasCss(resolvedTheme)) themesToLoad.push(resolvedTheme);

		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				let newHtml = html;

				const ssrAttributes = getSSRAttributes(themeManager, resolvedTheme);

				newHtml = newHtml.replace(HTML_TAG_REGEX, (_, existingAttributes) => {
					let updatedAttributes = existingAttributes;

					for (const [key, value] of Object.entries(ssrAttributes)) {
						if (key === "class") {
							if (updatedAttributes.includes("class="))
								updatedAttributes = updatedAttributes.replace(/class=["']([^"']*)["']/, `class="$1 ${value}"`);
							else updatedAttributes += ` class="${value}"`;
						} else if (key === "style") {
							if (updatedAttributes.includes("style="))
								updatedAttributes = updatedAttributes.replace(/style=["']([^"']*)["']/, `style="$1 ${value}"`);
							else updatedAttributes += ` style="${value}"`;
						} else updatedAttributes += ` ${key}="${value}"`;
					}

					return `<html${updatedAttributes}>`;
				});

				return newHtml.replaceAll("%sv-themes.css%", themesToLoad.map((theme) => getCssLink(theme)).join("\n"));
			},
		});

		return response;
	};
}
