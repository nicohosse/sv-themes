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

	if (cookies) {
		cookies.set(name, value, {
			expires: expires instanceof Date ? expires : new Date(expires),
			sameSite,
			secure: isSecure,
			path,
		});
		return;
	}

	if ("cookieStore" in globalThis) {
		try {
			await globalThis.cookieStore.set({
				name,
				value,
				expires: expires instanceof Date ? expires.getTime() : expires,
				sameSite,
				path,
			});
		} catch {
			console.error(`Failed to set cookie with name: ${name}`);
		}
	} else {
		const cookie = [
			`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
			`Expires=${expires instanceof Date ? expires.toUTCString() : new Date(expires).toUTCString()}`,
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

	if ("cookieStore" in globalThis) {
		const cookie = await globalThis.cookieStore.get(name);
		return cookie?.value;
	}

	const documentCookies = document.cookie.split("; ");

	for (const cookie of documentCookies) {
		const [key, value] = cookie.split("=");
		if (decodeURIComponent(key) === name) return decodeURIComponent(value);
	}

	return undefined;
}
