import type { Cookies } from "@sveltejs/kit";
import { describe, expect, it, vi } from "vitest";
import { createMockCookies } from "$lib/tests/cookie.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { getCookie, setCookie } from "./cookie.js";

describe("setCookie", () => {
	it("uses SvelteKit cookies API when provided", async () => {
		const cookies = createMockCookies();

		await setCookie("test-value", { name: "test-cookie" }, cookies as unknown as Cookies);

		expect(cookies.set).toHaveBeenCalledWith("test-cookie", "test-value", expect.anything());
	});

	it("normalizes numeric expires to Date for SvelteKit API", async () => {
		const cookies = createMockCookies();
		const timestamp = Date.now() + 10_000;

		await setCookie("test-value", { name: "test-cookie", expires: timestamp }, cookies as unknown as Cookies);

		const options = cookies.set.mock.calls[0][2];

		expect(options?.expires).toBeInstanceOf(Date);
		expect(options?.expires?.getTime()).toBe(timestamp);
	});

	it("uses cookieStore when available", async () => {
		const env = testEnv().cookieStore().apply();

		await setCookie("test-value", { name: "test-cookie" });

		expect(env.cookieStore.set).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "test-cookie",
				value: "test-value",
				sameSite: "lax",
				path: "/",
			}),
		);
	});

	it("propagates cookieStore failures", async () => {
		const env = testEnv().cookieStore().apply();
		env.cookieStore.set.mockRejectedValue(new Error("QuotaExceededError"));

		await expect(setCookie("test-value", { name: "test-cookie" })).rejects.toThrow(
			"Failed to set cookie with name: test-cookie",
		);
	});

	it("falls back to document.cookie when no cookieStore exists", async () => {
		testEnv().cookieStore(false).apply();

		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = "";

		await setCookie("test-value", { name: "test-cookie" });

		expect(document.cookie).toContain("test-cookie");
		expect(document.cookie).toContain("test-value");
	});

	it("resolves secure flag from browser context", async () => {
		const cookies = createMockCookies();

		vi.stubGlobal("isSecureContext", true);

		await setCookie("test-value", { name: "test-cookie" }, cookies as unknown as Cookies);

		expect(cookies.set.mock.calls[0][2].secure).toBe(true);

		vi.stubGlobal("isSecureContext", false);

		await setCookie("test-value", { name: "test-cookie" }, cookies as unknown as Cookies);

		expect(cookies.set.mock.calls[1][2].secure).toBe(false);
	});

	it("sets secure as undefined in SSR environment", async () => {
		testEnv().browser(false).apply();

		const cookies = createMockCookies();

		await setCookie("test-value", { name: "test-cookie" }, cookies as unknown as Cookies);

		const options = cookies.set.mock.calls[0][2];

		expect(options.secure).toBeUndefined();
	});

	it("encodes and applies full cookie attributes in document fallback", async () => {
		testEnv().cookieStore(false).apply();

		const expires = new Date("2030-01-01");

		await setCookie("value with spaces", {
			name: "name/with/slashes",
			expires,
			isSecure: true,
			path: "/",
			sameSite: "strict",
		});

		const cookie = document.cookie;

		expect(cookie).toContain("name%2Fwith%2Fslashes=value%20with%20spaces");
	});
});

describe("getCookie", () => {
	it("reads from SvelteKit cookies API", async () => {
		const cookies = {
			get: vi.fn().mockReturnValue("test-value"),
		};

		const result = await getCookie("test-cookie", cookies as unknown as Cookies);

		expect(cookies.get).toHaveBeenCalledWith("test-cookie");
		expect(result).toBe("test-value");
	});

	it("reads from cookieStore when available", async () => {
		const env = testEnv().cookieStore().apply();
		env.cookieStore.get.mockResolvedValue({ value: "test-value" });

		const result = await getCookie("test-cookie");

		expect(env.cookieStore.get).toHaveBeenCalledWith("test-cookie");
		expect(result).toBe("test-value");
	});

	it("returns undefined if cookieStore returns null", async () => {
		const env = testEnv().cookieStore().apply();
		env.cookieStore.get.mockResolvedValue(null);

		expect(await getCookie("missing")).toBeUndefined();
	});

	it("parses document.cookie with encoding and edge cases", async () => {
		testEnv().cookieStore(false).apply();

		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = "other=123";
		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = `${encodeURIComponent("complex name")}=${encodeURIComponent("encoded=value==123")}`;
		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = "third=456";

		const result = await getCookie("complex name");

		expect(result).toBe("encoded=value==123");
	});

	it("handles cookies containing '=' characters", async () => {
		testEnv().cookieStore(false).apply();

		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = "test-cookie=abc=def==ghi";

		const result = await getCookie("test-cookie");

		expect(result).toBe("abc=def==ghi");
	});

	it("returns undefined when cookie is not found", async () => {
		testEnv().cookieStore(false).apply();

		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = "hello=world";

		const result = await getCookie("missing");

		expect(result).toBeUndefined();
	});

	it("ignores malformed cookie entries", async () => {
		testEnv().cookieStore(false).apply();

		Object.defineProperty(document, "cookie", {
			configurable: true,
			get: () => "valid=value; malformed; another=test",
			set: vi.fn(),
		});

		expect(await getCookie("another")).toBe("test");
	});

	it("returns undefined in SSR environment", async () => {
		testEnv().browser(false).apply();

		expect(await getCookie("test-cookie")).toBeUndefined();
	});
});
