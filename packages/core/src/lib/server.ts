import type { Handle } from "@sveltejs/kit";
import { themeManager } from "./default-theme-manager.ts";

export function createThemeHandle(): Handle {
	return async ({ event, resolve }) => {
		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replaceAll("%sv-themes.attribute%", `data-theme="${themeManager.resolvedTheme}"`);
			},
		});

		return response;
	};
}
