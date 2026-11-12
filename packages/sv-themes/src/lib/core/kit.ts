import type { RequestEvent } from "@sveltejs/kit";
import type { Handle } from "@sveltejs/kit/hooks";
import { getThemeScript } from "./script.js";
import {
	CLASS_ATTRIBUTE_REGEX,
	createThemeSnapshot,
	escapeAttribute,
	escapeRegExp,
	FORCE_THEME_META_REGEX,
	getSSRAttributes,
	getSSRTags,
	HEAD_CLOSE_REGEX,
	HTML_TAG_REGEX,
	resolveForcedTheme,
	STYLE_ATTRIBUTE_REGEX,
	type ThemeManagerSnapshot,
} from "./snapshot.js";
import type { ThemeRecord } from "./theme/theme.js";
import { ThemeManagerError } from "./themeManager/errors.js";
import { getPersistedTheme } from "./themeManager/persistence.js";
import type { ThemeManager } from "./themeManager/themeManager.js";

export type ThemeHandleSource<Themes extends ThemeRecord> =
	| ThemeManager<Themes>
	| ((event: RequestEvent) => ThemeManager<Themes> | Promise<ThemeManager<Themes>>);

function injectAttributes(html: string, attributes: Record<string, string>): string {
	return html.replace(HTML_TAG_REGEX, (_, existingAttributes: string) => {
		let updatedAttributes = existingAttributes;

		for (const [key, value] of Object.entries(attributes)) {
			const escapedValue = escapeAttribute(value);

			if (key === "class") {
				if (CLASS_ATTRIBUTE_REGEX.test(updatedAttributes))
					updatedAttributes = updatedAttributes.replace(
						CLASS_ATTRIBUTE_REGEX,
						(_, existingClasses: string) => `class="${existingClasses} ${escapedValue}"`,
					);
				else updatedAttributes += ` class="${escapedValue}"`;
			} else if (key === "style") {
				if (STYLE_ATTRIBUTE_REGEX.test(updatedAttributes))
					updatedAttributes = updatedAttributes.replace(
						STYLE_ATTRIBUTE_REGEX,
						(_, existingStyles: string) => `style="${existingStyles} ${escapedValue}"`,
					);
				else updatedAttributes += ` style="${escapedValue}"`;
			} else {
				const attributeRegex = new RegExp(`\\s${escapeRegExp(key)}=(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "i");

				if (attributeRegex.test(updatedAttributes))
					updatedAttributes = updatedAttributes.replace(attributeRegex, ` ${key}="${escapedValue}"`);
				else updatedAttributes += ` ${key}="${escapedValue}"`;
			}
		}

		return `<html${updatedAttributes}>`;
	});
}

/**
 * SvelteKit server-side handle hook that injects resolved theme state into the page.
 *
 * Persistence is resolved into a request-scoped snapshot, so a shared module-level
 * manager is never mutated during SSR. When a factory is supplied, a fresh manager is
 * created for every request as well.
 *
 * @param themeManager - The active theme manager, or a factory producing one per request.
 * @param cspNonce - The nonce for the bootloader script.
 * @returns A SvelteKit `Handle` middleware function.
 */
export function createThemeHandle<const Themes extends ThemeRecord>(
	themeManager: ThemeHandleSource<Themes>,
	cspNonce?: string,
): Handle {
	return async ({ event, resolve }) => {
		const activeThemeManager = typeof themeManager === "function" ? await themeManager(event) : themeManager;

		const persistedTheme = await getPersistedTheme(activeThemeManager, {
			serverSideOnly: true,
			fixErrors: true,
			cookies: event.cookies,
		});

		const resolvedCspNonce = cspNonce ?? event.locals?.svThemesScriptNonce;

		let buffer = "";
		let processed = false;

		const transformHtml = (html: string) => {
			const rawForcedTheme = resolveForcedTheme(html);
			const forcedTheme = rawForcedTheme as keyof Themes | "system" | undefined;

			if (forcedTheme && forcedTheme !== "system" && !(forcedTheme in activeThemeManager.themes))
				throw new Error(ThemeManagerError.themeNotFound(forcedTheme.toString()).message);

			if (forcedTheme === "system" && activeThemeManager.systemThemes.kind === "disabled")
				throw new Error(ThemeManagerError.systemThemesDisabled.message);

			const snapshot = createThemeSnapshot(activeThemeManager, { persistedTheme, forcedTheme });

			if (event.locals) (event.locals as { svThemes?: ThemeManagerSnapshot<Themes> }).svThemes = snapshot;

			const ssrAttributes = getSSRAttributes(snapshot);
			const ssrTags = getSSRTags(snapshot);

			const scriptContent = getThemeScript(snapshot);
			const scriptTag = `<script${resolvedCspNonce ? ` nonce="${escapeAttribute(resolvedCspNonce)}"` : ""}>${scriptContent}</script>`;

			const withAttributes = injectAttributes(html, ssrAttributes);
			const withoutForcedMeta = withAttributes.replaceAll(FORCE_THEME_META_REGEX, "");
			const injectedHead = `${ssrTags.join("")}${scriptTag}`;

			if (HEAD_CLOSE_REGEX.test(withoutForcedMeta))
				return withoutForcedMeta.replace(HEAD_CLOSE_REGEX, (match) => `${injectedHead}${match}`);

			return `${withoutForcedMeta}${injectedHead}`;
		};

		return await resolve(event, {
			transformPageChunk: ({ html, done }) => {
				if (processed) return html;

				buffer += html;

				// Forced theme meta tags live in the head. Wait until the head is complete
				// (or the document is done) before resolving anything so a theme declared
				// by a nested route is never missed.
				if (!done && !HEAD_CLOSE_REGEX.test(buffer)) return "";

				processed = true;

				const transformedHtml = transformHtml(buffer);
				buffer = "";

				return transformedHtml;
			},
		});
	};
}
