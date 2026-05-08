import type { Handle } from "@sveltejs/kit";
import { getThemeScript } from "./script.js";
import { getSSRAttributes } from "./server.js";
import { getCssLinks, hasCss, type ThemesRecord } from "./theme.js";
import { getErrorMessage } from "./theme-manager.errors.js";
import { getPersistedTheme, type ThemeManager } from "./theme-manager.svelte.js";

const HTML_TAG_REGEX = /<html([^>]*)>/;
const HEAD_CLOSE_REGEX = /<\/head>/;

export function createThemeHandle<Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>): Handle {
	return async ({ event, resolve }) => {
		const persistedTheme = await getPersistedTheme(themeManager, {
			serverSideOnly: true,
			cookies: event.cookies,
		});

		if (persistedTheme) themeManager.setTheme(persistedTheme, false);

		// TODO: Figure out better scoping solution. Placeholder.
		const forcedTheme: string | undefined = undefined;

		const forcedThemeResult = themeManager.setForcedTheme(forcedTheme);
		if (forcedThemeResult.isErr()) throw new Error(getErrorMessage(forcedThemeResult.error));

		const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];

		const eagerlyLoadedThemes = Object.values(themeManager.themes)
			.filter(hasCss)
			.filter((theme) => !theme.css.lazyLoading);

		const themesToLoad = [...eagerlyLoadedThemes];

		if (hasCss(resolvedTheme)) themesToLoad.push(resolvedTheme);

		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				let newHtml = html;

				const ssrAttributes = getSSRAttributes(themeManager);

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

				const cspNonce = event.locals.cspNonce;

				const scriptContent = getThemeScript({ ...themeManager });
				const scriptTag = `<script${cspNonce ? `nonce=${cspNonce}` : ""}>${scriptContent}</script>`;

				return newHtml.replace(
					HEAD_CLOSE_REGEX,
					`${themesToLoad.map((theme) => getCssLinks(theme)?.join("\n")).join("\n")}\n${scriptTag}</head>`,
				);
			},
		});

		return response;
	};
}
