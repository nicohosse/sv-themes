import type { Handle } from "@sveltejs/kit";
import { flushSync } from "svelte";
import type { ThemeManager } from "$lib/index.js";
import { getThemeScript } from "./script.js";
import {
	CLASS_ATTRIBUTE_REGEX,
	FORCE_THEME_META_REGEX,
	getSSRAttributes,
	getSSRTags,
	HEAD_CLOSE_REGEX,
	HTML_TAG_REGEX,
	resolveForcedTheme,
	STYLE_ATTRIBUTE_REGEX,
} from "./server.js";
import type { ThemeRecord } from "./theme/theme.js";
import { getPersistedTheme } from "./theme-manager/index.js";

/**
 * SvelteKit server-side handle hook that intercepts page requests to inject theme variables.
 * Resolves scoped theme overrides and injects the bootloader script.
 *
 * @param themeManager - The active theme manager instance.
 * @param cspNonce - The nonce for the bootloader script.
 * @returns A SvelteKit `Handle` middleware function.
 */
export function createThemeHandle<Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	cspNonce?: string,
): Handle {
	return async ({ event, resolve }) => {
		const persistedTheme = await getPersistedTheme(themeManager, {
			serverSideOnly: true,
			cookies: event.cookies,
		});

		if (persistedTheme) themeManager.setTheme(persistedTheme, false);

		const resolvedCspNonce = cspNonce ?? event.locals?.svThemesScriptNonce;

		let cachedData: {
			ssrAttributes: ReturnType<typeof getSSRAttributes>;
			scriptTag: string;
			ssrTags: string[];
		} | null = null;

		return await resolve(event, {
			transformPageChunk: async ({ html }) => {
				if (!cachedData || html.includes("head>")) {
					const forcedTheme = resolveForcedTheme(html) as keyof Themes | "system" | undefined;

					const forcedThemeResult = await themeManager.setForcedTheme(forcedTheme);
					if (forcedThemeResult.isErr()) throw new Error(forcedThemeResult.error.message);

					flushSync();

					const ssrAttributes = getSSRAttributes(themeManager);
					const ssrTags = getSSRTags(themeManager);

					const scriptContent = getThemeScript({ ...themeManager });
					const scriptTag = `<script${resolvedCspNonce ? ` nonce="${resolvedCspNonce}"` : ""}>${scriptContent}</script>`;

					cachedData = {
						ssrAttributes,
						scriptTag,
						ssrTags,
					};
				}

				return html
					.replace(HTML_TAG_REGEX, (_, existingAttributes) => {
						if (!cachedData) return existingAttributes;

						let updatedAttributes = existingAttributes;

						for (const [key, value] of Object.entries(cachedData.ssrAttributes))
							if (key === "class")
								if (updatedAttributes.includes("class="))
									updatedAttributes = updatedAttributes.replace(CLASS_ATTRIBUTE_REGEX, `class="${value} $1"`);
								else updatedAttributes += ` class="${value}"`;
							else if (key === "style")
								if (updatedAttributes.includes("style="))
									updatedAttributes = updatedAttributes.replace(STYLE_ATTRIBUTE_REGEX, `style="${value} $1"`);
								else updatedAttributes += ` style="${value}"`;
							else updatedAttributes += ` ${key}="${value}"`;

						return `<html${updatedAttributes}>`;
					})
					.replace(HEAD_CLOSE_REGEX, `${cachedData.scriptTag}${cachedData.ssrTags.join("")}</head>`)
					.replaceAll(FORCE_THEME_META_REGEX, "");
			},
		});
	};
}
