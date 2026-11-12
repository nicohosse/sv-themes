import type { Handle } from "@sveltejs/kit/hooks";
import { sequence } from "@sveltejs/kit/hooks";
import { createThemeHandle } from "sv-themes/kit";
import { createRequestThemeManager } from "#lib/themeManager.svelte.js";

const nonceHandle: Handle = async ({ event, resolve }) => {
	const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
	event.locals.svThemesScriptNonce = nonce;

	return await resolve(event, {
		transformPageChunk: ({ html }) => {
			return html.replaceAll(/<script(?![^>]*\bnonce=)/g, `<script nonce="${nonce}"`);
		},
	});
};

const themeHandle = createThemeHandle(() => createRequestThemeManager());

export const handle = sequence(nonceHandle, themeHandle);
