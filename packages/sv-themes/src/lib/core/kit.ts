import type { Handle } from "@sveltejs/kit";
import { flushSync } from "svelte";
import { getThemeScript } from "./script.js";
import {
	CLASS_ATTRIBUTE_REGEX,
	FORCED_THEME_META_REGEX,
	getSSRAttributes,
	HEAD_CLOSE_REGEX,
	HTML_TAG_REGEX,
	resolveForcedTheme,
	STYLE_ATTRIBUTE_REGEX,
} from "./server.js";
import type { ThemesRecord } from "./theme.js";
import { getErrorMessage } from "./theme-manager.errors.js";
import { getPersistedTheme, type ThemeManager } from "./theme-manager.svelte.js";

export function createThemeHandle<Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>): Handle {
	return async ({ event, resolve }) => {
		const persistedTheme = await getPersistedTheme(themeManager, {
			serverSideOnly: true,
			cookies: event.cookies,
		});

		if (persistedTheme) themeManager.setTheme(persistedTheme, false);

		const cspNonce = event.locals.cspNonce;

		let cachedData: {
			ssrAttributes: ReturnType<typeof getSSRAttributes>;
			scriptTag: string;
		} | null = null;

		return await resolve(event, {
			transformPageChunk: async ({ html }) => {
				if (!cachedData) {
					const forcedTheme = resolveForcedTheme(html) as keyof Themes | "system" | undefined;
					const forcedThemeResult = await themeManager.setForcedTheme(forcedTheme);
					if (forcedThemeResult.isErr()) throw new Error(getErrorMessage(forcedThemeResult.error));

					flushSync();

					const ssrAttributes = getSSRAttributes(themeManager);

					const scriptContent = getThemeScript({ ...themeManager });
					const scriptTag = `<script${cspNonce ? ` nonce="${cspNonce}"` : ""}>${scriptContent}</script>`;

					cachedData = {
						ssrAttributes,
						scriptTag,
					};
				}

				return html
					.replace(HTML_TAG_REGEX, (_, existingAttributes) => {
						if (!cachedData) return existingAttributes;

						let updatedAttributes = existingAttributes;

						for (const [key, value] of Object.entries(cachedData.ssrAttributes))
							if (key === "class")
								if (updatedAttributes.includes("class="))
									updatedAttributes = updatedAttributes.replace(CLASS_ATTRIBUTE_REGEX, `class="$1 ${value}"`);
								else updatedAttributes += ` class="${value}"`;
							else if (key === "style")
								if (updatedAttributes.includes("style="))
									updatedAttributes = updatedAttributes.replace(STYLE_ATTRIBUTE_REGEX, `style="$1 ${value}"`);
								else updatedAttributes += ` style="${value}"`;
							else updatedAttributes += ` ${key}="${value}"`;

						return `<html${updatedAttributes}>`;
					})
					.replace(HEAD_CLOSE_REGEX, `\n${cachedData.scriptTag}</head>`)
					.replaceAll(FORCED_THEME_META_REGEX, "");
			},
		});
	};
}
