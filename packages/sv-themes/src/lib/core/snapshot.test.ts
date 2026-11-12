import { describe, expect, it } from "vitest";
import { createThemes } from "#lib/index.js";
import { expectOk } from "#lib/tests/setup.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "#lib/tests/themeManager.js";
import { getSSRAttributes, getSSRTags, normalizeForcedTheme, resolveForcedTheme } from "./snapshot.js";
import { createThemeManager } from "./themeManager/createThemeManager.svelte.js";

describe("getSSRAttributes", () => {
	it("applies class attribute using resolved theme", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					initialTheme: "light",
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result.class).toBe(MOCK_THEME_MANAGER_CONFIG.themes.light.className ?? "light");
	});

	it("applies data attributes using resolved theme", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					initialTheme: "light",
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result["data-theme"]).toBe("light");
	});

	it("adds forced theme attribute when enabled", async () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					forcedTheme: "light",
					isThemeForcedAttribute: "data-is-theme-forced",
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result["data-is-theme-forced"]).toBe("true");
	});

	it("adds system theme attribute when enabled", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					systemThemes: {
						kind: "enabled",
					},
					useSystemTheme: true,
					isSystemThemeAttribute: "data-is-system-theme",
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result["data-is-system-theme"]).toBe("true");
	});

	it("adds system theme attribute and forced theme attribute when forced theme is 'system'", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					systemThemes: {
						kind: "enabled",
					},
					forcedTheme: "system",
					isThemeForcedAttribute: "data-is-theme-forced",
					isSystemThemeAttribute: "data-is-system-theme",
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result["data-is-theme-forced"]).toBe("true");
		expect(result["data-is-system-theme"]).toBe("true");
	});

	it("adds color-scheme style when enabled", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					useColorScheme: true,
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result.style).toBe("color-scheme: light;");
	});

	it("combines multiple attributes correctly", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					attributes: ["class", "data-theme"],
					useColorScheme: true,
					useSystemTheme: true,
					isThemeForcedAttribute: "data-is-theme-forced",
					isSystemThemeAttribute: "data-is-system-theme",
				}),
			),
		);

		const result = getSSRAttributes(themeManager);

		expect(result.class).toBe("light");
		expect(result["data-theme"]).toBe("light");
		expect(result["data-is-theme-forced"]).toBeUndefined();
		expect(result["data-is-system-theme"]).toBe("true");
		expect(result.style).toBe("color-scheme: light;");
	});
});

describe("getSSRTags", () => {
	describe("theme-color", () => {
		it("skips theme-color meta tag if useThemeColor is false", () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						useThemeColor: false,
					}),
				),
			);

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("theme-color"))).toBeUndefined();
		});

		it("skips theme-color meta tag if theme doesnt have a color assigned", () => {
			const themes = createThemes([{ id: "nature", type: "light" }]);

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						themes,
						initialTheme: "nature",
					}),
				),
			);

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("theme-color"))).toBeUndefined();
		});

		it("sets theme-color using hex format", () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("theme-color"))).toContain('content="#fff"');
		});

		it("adds a favicon link when the resolved theme defines one", () => {
			const themes = createThemes([{ id: "light", type: "light", favicon: "/light.svg" }]);

			const themeManager = expectOk(createThemeManager({ themes, initialTheme: "light" }));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags).toContain('<link rel="icon" href="/light.svg">');
		});

		it("omits the favicon link when useFavicon is disabled", () => {
			const themes = createThemes([{ id: "light", type: "light", favicon: "/light.svg" }]);

			const themeManager = expectOk(createThemeManager({ themes, initialTheme: "light", useFavicon: false }));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes('rel="icon"'))).toBeUndefined();
		});

		it("skips meta tag if theme-color isnt hex", () => {
			const themes = createThemes([{ id: "light", type: "light", color: "var(--missing)" }]);

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						themes,
					}),
				),
			);

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("theme-color"))).toBeUndefined();
		});
	});

	describe("color-scheme", () => {
		it("skips color-scheme meta tag and style if useColorScheme is false", () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						useColorScheme: false,
					}),
				),
			);

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("color-scheme"))).toBeUndefined();
		});

		it("creates or updates the color-scheme meta tag with light dark content if enabled", () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("color-scheme"))).toContain('content="light dark"');
		});

		it("creates or updates the color-scheme meta tag with dark light content if enabled", () => {
			const themes = createThemes([
				{ id: "dark", type: "dark" },
				{ id: "light", type: "light" },
			]);

			const themeManager = expectOk(createThemeManager({ ...MOCK_THEME_MANAGER_CONFIG, themes }));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("color-scheme"))).toContain('content="dark light"');
		});

		it("creates or updates the color-scheme with light content when there is no dark theme if enabled", () => {
			const themes = createThemes([{ id: "light", type: "light" }]);

			const themeManager = expectOk(createThemeManager({ themes, initialTheme: "light" }));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("color-scheme"))).toContain('content="light"');
		});

		it("creates or updates the color-scheme with dark content when there is no light theme if enabled", () => {
			const themes = createThemes([{ id: "dark", type: "dark" }]);

			const themeManager = expectOk(createThemeManager({ themes, initialTheme: "dark" }));

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("color-scheme"))).toContain('content="dark"');
		});
	});
});

describe("normalizeForcedTheme", () => {
	it("returns undefined if the value undefined", () => {
		expect(normalizeForcedTheme(undefined)).toBeUndefined();
	});

	it('returns undefined if the value is "undefined"', () => {
		expect(normalizeForcedTheme("undefined")).toBeUndefined();
	});

	it('returns undefined if the value is "null"', () => {
		expect(normalizeForcedTheme("null")).toBeUndefined();
	});
});

describe("resolveForcedTheme", () => {
	function forcedMeta(request: {
		forcedTheme?: string | null;
		priority?: number;
		overrideChildren?: boolean;
		depth?: number;
	}) {
		return `<meta name="sv-themes-force-theme" content="${encodeURIComponent(
			JSON.stringify({
				forcedTheme: request.forcedTheme ?? null,
				priority: request.priority ?? 0,
				overrideChildren: request.overrideChildren ?? false,
				depth: request.depth ?? 0,
			}),
		)}" />`;
	}

	it("returns undefined when no meta tags exist", () => {
		expect(resolveForcedTheme("<html><head></head></html>")).toBeUndefined();
	});

	it("extracts forcedTheme from single meta tag", () => {
		expect(resolveForcedTheme(forcedMeta({ forcedTheme: "dark", priority: 1 }))).toBe("dark");
	});

	it("resolves highest priority meta tag", () => {
		const html = [
			forcedMeta({ forcedTheme: "light", priority: 1 }),
			forcedMeta({ forcedTheme: "dark", priority: 5 }),
		].join("");

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("blocks descendants of a request with overrideChildren", () => {
		const html = [
			forcedMeta({ forcedTheme: "dark", priority: 10, overrideChildren: true, depth: 0 }),
			forcedMeta({ forcedTheme: "light", priority: 100, depth: 1 }),
		].join("");

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("allows children to override when overrideChildren is false", () => {
		const html = [
			forcedMeta({ forcedTheme: "light", priority: 1, depth: 0 }),
			forcedMeta({ forcedTheme: "dark", priority: 5, depth: 1 }),
		].join("");

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("does not treat sibling requests as descendants", () => {
		const html = [
			forcedMeta({ forcedTheme: "dark", priority: 10, overrideChildren: true, depth: 0 }),
			forcedMeta({ forcedTheme: "light", priority: 100, depth: 1 }),
			forcedMeta({ forcedTheme: "dark", priority: 200, depth: 1 }),
		].join("");

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("handles undefined/null string normalization", () => {
		expect(resolveForcedTheme(forcedMeta({ forcedTheme: null, priority: 1 }))).toBeUndefined();
	});

	it("handles multiple same-priority tags (last wins)", () => {
		const html = [
			forcedMeta({ forcedTheme: "light", priority: 2 }),
			forcedMeta({ forcedTheme: "dark", priority: 2 }),
		].join("");

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("supports the legacy content format", () => {
		const html = `<meta name="sv-themes-force-theme" content="forcedTheme=dark;priority=1;overrideChildren=false" />`;

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("handles missing groups safely", () => {
		const html = `<meta name="sv-themes-force-theme" content="bad-format" />`;

		expect(resolveForcedTheme(html)).toBeUndefined();
	});
});
