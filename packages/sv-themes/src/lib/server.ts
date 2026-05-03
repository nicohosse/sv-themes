import type { Handle } from "@sveltejs/kit";

export function createThemeHandle(): Handle {
	return async ({ event, resolve }) => {
		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replaceAll("%sv-themes.attribute%", `data-theme="dark"`);
			},
		});

		return response;
	};
}
