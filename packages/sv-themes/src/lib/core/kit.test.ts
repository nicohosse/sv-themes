import type { RequestEvent } from "@sveltejs/kit";
import { describe, expect, it, vi } from "vitest";
import { ThemeManagerError } from "#lib/index.js";
import { createMockCookies } from "#lib/tests/cookie.js";
import { expectOk } from "#lib/tests/setup.js";
import { testEnv } from "#lib/tests/testEnvironment.js";
import { MOCK_THEME_MANAGER_CONFIG } from "#lib/tests/themeManager.js";
import { createThemeHandle } from "./kit.js";
import { createThemeManager } from "./themeManager/index.js";

describe("createThemeHandle", () => {
	const EMPTY_HTML = "<html><head></head><body></body></html>";

	it("injects attributes with no persisted theme", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = EMPTY_HTML;
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="light"');
		expect(result).toContain(`class="${themeManager.themes.light.className ?? "light"}`);
	});

	it("resolves and injects attributes with persisted theme", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies({ theme: "dark" }),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = EMPTY_HTML;
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="dark"');
		expect(result).toContain(`class="${themeManager.themes.dark.className ?? "dark"}`);
	});

	it("injects theme script without cspNonce", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = EMPTY_HTML;
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain("<script>");
	});

	it("injects theme script with csp nonce from event locals", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
			locals: {
				svThemesScriptNonce: "test-nonce",
			},
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = EMPTY_HTML;
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('<script nonce="test-nonce">');
	});

	it("injects theme script with csp nonce from argument", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = EMPTY_HTML;
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager, "test-nonce");
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('<script nonce="test-nonce">');
	});

	it("injects class attribute", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = '<html class="existing-class"><head></head></html>';
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain(`class="existing-class ${themeManager.themes.light.className ?? "light"}`);
	});

	it("injects style attribute", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = "<html><head></head></html>";
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain("color-scheme: light;");
	});

	it("injects custom attributes", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = "<html><head></head></html>";
			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="light"');
	});

	it("handles valid forced theme meta tags and sorts by priority", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html =
				'<html><head><meta name="sv-themes-force-theme" content="forcedTheme=dark;priority=0;overrideChildren=false" /><meta name="sv-themes-force-theme" content="forcedTheme=light;priority=1;overrideChildren=false" /></head></html>';

			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="light"');
		expect(result).toContain(`class="${themeManager.themes.light.className ?? "light"}`);
	});

	it("handles valid forced theme meta tags and respects overrideChildren", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const parentMeta = `<meta name="sv-themes-force-theme" content="${encodeURIComponent(
			JSON.stringify({ forcedTheme: "dark", priority: 0, overrideChildren: true, depth: 0 }),
		)}" />`;
		const childMeta = `<meta name="sv-themes-force-theme" content="${encodeURIComponent(
			JSON.stringify({ forcedTheme: "light", priority: 1, overrideChildren: false, depth: 1 }),
		)}" />`;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html = `<html><head>${parentMeta}${childMeta}</head></html>`;

			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="dark"');
		expect(result).toContain(`class="${themeManager.themes.dark.className ?? "dark"}`);
	});

	it("does not leak persisted theme state between requests", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const makeResolve = () =>
			vi.fn().mockImplementation(async (_event, opts) => {
				const html = EMPTY_HTML;
				const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

				return new Response(transformedHtml);
			});

		const handle = createThemeHandle(themeManager);

		const darkResponse = await handle({
			event: { cookies: createMockCookies({ theme: "dark" }) } as unknown as RequestEvent,
			resolve: makeResolve(),
		});

		expect(await darkResponse.text()).toContain('data-theme="dark"');

		const anonymousResponse = await handle({
			event: { cookies: createMockCookies() } as unknown as RequestEvent,
			resolve: makeResolve(),
		});

		expect(await anonymousResponse.text()).toContain('data-theme="light"');
		expect(themeManager.resolvedTheme).toBe("light");
	});

	it("exposes the request snapshot on event.locals", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
		const locals: { svThemes?: unknown } = {};

		const mockEvent = {
			cookies: createMockCookies({ theme: "dark" }),
			locals,
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const transformedHtml = opts?.transformPageChunk
				? await opts.transformPageChunk({ html: EMPTY_HTML })
				: EMPTY_HTML;

			return new Response(transformedHtml);
		});

		await createThemeHandle(themeManager)({ event: mockEvent, resolve: mockResolve });

		expect(locals.svThemes).toMatchObject({ resolvedTheme: "dark", selectedTheme: "dark" });
	});

	it("buffers chunks until the head is complete", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const first = await opts.transformPageChunk({ html: "<html><head>", done: false });
			const second = await opts.transformPageChunk({ html: "</head><body></body></html>", done: true });

			return new Response(`${first}${second}`);
		});

		const response = await createThemeHandle(themeManager)({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="light"');
		expect(result).toContain("<script>");
	});

	it("supports a per-request theme manager factory", async () => {
		testEnv().browser(false).apply();

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const transformedHtml = opts?.transformPageChunk
				? await opts.transformPageChunk({ html: EMPTY_HTML })
				: EMPTY_HTML;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(() => expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG)));

		const response = await handle({ event: mockEvent, resolve: mockResolve });

		expect(await response.text()).toContain('data-theme="light"');
	});

	it("throws an error when forced theme is invalid", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const mockEvent = {
			cookies: createMockCookies(),
		} as unknown as RequestEvent;

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html =
				'<html><head><meta name="sv-themes-force-theme" content="forcedTheme=missing;priority=0;overrideChildren=false" />" /></head></html>';

			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);

		await expect(handle({ event: mockEvent, resolve: mockResolve })).rejects.toThrow(
			ThemeManagerError.themeNotFound("missing").message,
		);
	});
});
