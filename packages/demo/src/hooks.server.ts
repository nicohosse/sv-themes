import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { createThemeHandle } from "sv-themes/kit";
import { themeManager } from "$lib/theme-manager.svelte";

const nonceHandle: Handle = async ({ event, resolve }) => {
	const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
	event.locals.cspNonce = nonce;

	return await resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replaceAll(/<script(?![^>]*\bnonce=)/g, `<script nonce="${nonce}"`);
		},
	});
};

const themeHandle = createThemeHandle(themeManager);

export const handle = sequence(nonceHandle, themeHandle);
