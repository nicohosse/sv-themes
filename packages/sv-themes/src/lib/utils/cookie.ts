import type { Cookies } from "@sveltejs/kit";
import { BROWSER } from "esm-env";

export interface CookieOptions {
	name: string;
	expires?: Date | number;
	sameSite?: CookieSameSite;
	isSecure?: boolean;
	path?: string;
}

export async function setCookie(value: string, options: CookieOptions, cookies?: Cookies) {
	const oneYearFromNow = new Date();
	oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

	const {
		name,
		expires = oneYearFromNow,
		sameSite = "lax",
		isSecure = BROWSER ? globalThis.isSecureContext : undefined,
		path = "/",
	} = options;

	const expiresDate = expires instanceof Date ? expires : new Date(expires);

	if (cookies) {
		cookies.set(name, value, {
			expires: expiresDate,
			sameSite,
			secure: isSecure,
			path,
		});
		return;
	}

	if ("cookieStore" in globalThis && globalThis.cookieStore) {
		try {
			await globalThis.cookieStore.set({
				name,
				value,
				expires: expiresDate.getTime(),
				sameSite,
				path,
			});
		} catch {
			throw new Error(`Failed to set cookie with name: ${name}`);
		}
	} else {
		const cookie = [
			`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
			`Expires=${expiresDate.toUTCString()}`,
			`SameSite=${sameSite}`,
			`Path=${path}`,
			isSecure ? "Secure" : "",
		]
			.filter(Boolean)
			.join("; ");

		// biome-ignore lint/suspicious/noDocumentCookie: fallback
		document.cookie = cookie;
	}
}

export async function getCookie(name: string, cookies?: Cookies): Promise<string | undefined> {
	if (cookies) return cookies.get(name);

	if (!BROWSER) return undefined;

	if ("cookieStore" in globalThis && globalThis.cookieStore) {
		const cookie = await globalThis.cookieStore.get(name);
		return cookie?.value;
	}

	const documentCookies = document.cookie
		.split(";")
		.map((cookie) => cookie.trim())
		.filter(Boolean);

	for (const cookie of documentCookies) {
		const separatorIndex = cookie.indexOf("=");

		if (separatorIndex === -1) continue;

		const key = cookie.slice(0, separatorIndex);
		const value = cookie.slice(separatorIndex + 1);

		if (decodeURIComponent(key) === name) return decodeURIComponent(value);
	}

	return undefined;
}
