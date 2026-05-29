import type { RequestEvent } from "@sveltejs/kit";
import { describe, expect, it, vi } from "vitest";
import { ThemeManagerError } from "$lib/index.js";
import { createMockCookies } from "$lib/tests/cookie.js";
import { expectOk } from "$lib/tests/setup.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { createThemeHandle } from "./kit.js";
import { createThemeManager } from "./theme-manager/index.js";

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

		expect(result).toContain(`class="${themeManager.themes.light.className ?? "light"}`);
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

		const mockResolve = vi.fn().mockImplementation(async (_event, opts) => {
			const html =
				'<html><head><meta name="sv-themes-force-theme" content="forcedTheme=dark;priority=0;overrideChildren=true" /><meta name="sv-themes-force-theme" content="forcedTheme=light;priority=1;overrideChildren=false" /></head></html>';

			const transformedHtml = opts?.transformPageChunk ? await opts.transformPageChunk({ html }) : html;

			return new Response(transformedHtml);
		});

		const handle = createThemeHandle(themeManager);
		const response = await handle({ event: mockEvent, resolve: mockResolve });
		const result = await response.text();

		expect(result).toContain('data-theme="dark"');
		expect(result).toContain(`class="${themeManager.themes.dark.className ?? "dark"}`);
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
