import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { createThemeHandle } from "sv-themes/kit";
import { themeManager } from "$lib/theme-manager.svelte";

const nonceHandle: Handle = async ({ event, resolve }) => {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	const nonce = btoa(String.fromCharCode(...bytes));

	event.locals.cspNonce = nonce;

	const response = await resolve(event);
	response.headers.set("content-security-policy", `script-src 'self' 'nonce-${nonce}'`);

	return response;
};

const themeHandle = createThemeHandle(themeManager);

export const handle = sequence(nonceHandle, themeHandle);
