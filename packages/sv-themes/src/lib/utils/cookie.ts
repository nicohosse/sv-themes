import { BROWSER } from "esm-env";

export interface CookieOptions {
	name: string;
	expires?: Date | number;
	sameSite?: CookieSameSite;
	isSecure?: boolean;
}

export async function setCookie(value: string, options: CookieOptions) {
	const oneYearFromNow = new Date();
	oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

	const {
		name,
		expires = oneYearFromNow,
		sameSite = "lax",
		isSecure = BROWSER ? globalThis.isSecureContext : true,
	} = options;

	if ("cookieStore" in globalThis) {
		try {
			await globalThis.cookieStore.set({
				name,
				value,
				expires: expires instanceof Date ? expires.getTime() : expires,
				sameSite,
			});
		} catch {
			console.error(`Failed to set cookie with name: ${name}`);
		}
	} else {
		const cookie = [
			`${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
			`Expires=${expires instanceof Date ? expires.toUTCString() : new Date(expires).toUTCString()}`,
			`SameSite=${sameSite}`,
			isSecure ? "Secure" : "",
		]
			.filter(Boolean)
			.join("; ");

		// biome-ignore lint/suspicious/noDocumentCookie: fallback
		document.cookie = cookie;
	}
}

export async function getCookie(name: string): Promise<string | undefined> {
	if ("cookieStore" in globalThis) {
		const cookie = await globalThis.cookieStore.get(name);
		return cookie?.value;
	}

	const cookies = document.cookie.split("; ");

	for (const cookie of cookies) {
		const [key, value] = cookie.split("=");
		if (decodeURIComponent(key) === name) return decodeURIComponent(value);
	}

	return undefined;
}
