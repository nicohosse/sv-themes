import { describe, expect, it, vi } from "vitest";
import { createThemes } from "$lib/index.js";
import { expectOk } from "$lib/tests/setup.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { getSSRAttributes, getSSRTags, normalizeForcedTheme, resolveForcedTheme } from "./server.js";
import { createThemeManager } from "./theme-manager/create-theme-manager.svelte.js";

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

		expect(result["data-theme"]).toBe(MOCK_THEME_MANAGER_CONFIG.themes.light.className ?? "light");
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

		it("sets non-hex theme-color if color can be resolved", () => {
			const themes = createThemes([{ id: "light", type: "light", color: "white" }]);

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						themes,
					}),
				),
			);

			const ssrTags = getSSRTags(themeManager);

			expect(ssrTags.find((tag) => tag.includes("theme-color"))).toContain('content="rgb(255, 255, 255)"');
		});

		it("logs error and skips meta tag if non-hex theme-color cannot be resolved", () => {
			const themes = createThemes([{ id: "light", type: "light", color: "var(--missing)" }]);

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						themes,
					}),
				),
			);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const ssrTags = getSSRTags(themeManager);

			expect(consoleSpy).toHaveBeenCalledExactlyOnceWith(
				"The color of theme 'light' couldn't be resolved. Skipping theme-color meta tag.",
			);

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
	it("returns undefined when no meta tags exist", () => {
		expect(resolveForcedTheme("<html><head></head></html>")).toBeUndefined();
	});

	it("extracts forcedTheme from single meta tag", () => {
		const html = `
			<meta name="sv-themes-force-theme"
				content="forcedTheme=dark;priority=1;overrideChildren=false"
			/>
		`;

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("resolves highest priority meta tag", () => {
		const html = `
			<meta name="sv-themes-force-theme"
				content="forcedTheme=light;priority=1;overrideChildren=false"
			/>
			<meta name="sv-themes-force-theme"
				content="forcedTheme=dark;priority=5;overrideChildren=false"
			/>
		`;

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("stops on overrideChildren=true and locks value", () => {
		const html = `
			<meta name="sv-themes-force-theme"
				content="forcedTheme=light;priority=1;overrideChildren=false"
			/>
			<meta name="sv-themes-force-theme"
				content="forcedTheme=dark;priority=10;overrideChildren=true"
			/>
			<meta name="sv-themes-force-theme"
				content="forcedTheme=blue;priority=100;overrideChildren=false"
			/>
		`;

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("handles undefined/null string normalization", () => {
		const html = `
			<meta name="sv-themes-force-theme"
				content="forcedTheme=undefined;priority=1;overrideChildren=false"
			/>
		`;

		expect(resolveForcedTheme(html)).toBeUndefined();
	});

	it("handles multiple same-priority tags (last wins)", () => {
		const html = `
			<meta name="sv-themes-force-theme"
				content="forcedTheme=light;priority=2;overrideChildren=false"
			/>
			<meta name="sv-themes-force-theme"
				content="forcedTheme=dark;priority=2;overrideChildren=false"
			/>
		`;

		expect(resolveForcedTheme(html)).toBe("dark");
	});

	it("handles missing groups safely", () => {
		const html = `<meta name="sv-themes-force-theme" content="bad-format" />`;

		expect(resolveForcedTheme(html)).toBeUndefined();
	});
});
