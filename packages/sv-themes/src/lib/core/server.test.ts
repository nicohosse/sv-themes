import { describe, expect, it } from "vitest";
import { createThemeManager } from "$lib/tests/theme-manager.js";
import { getSSRAttributes, resolveForcedTheme } from "./server.js";

describe("getSSRAttributes", () => {
	it("applies class attribute using resolved theme className", () => {
		const themeManager = createThemeManager({
			initialTheme: "light",
		});

		const result = getSSRAttributes(themeManager);

		expect(result.class).toBe("light");
	});

	it("applies data attributes using resolved theme className", () => {
		const themeManager = createThemeManager({
			initialTheme: "light",
		});

		const result = getSSRAttributes(themeManager);

		expect(result["data-theme"]).toBe("light");
	});

	it("adds forced theme attribute when enabled", async () => {
		const themeManager = createThemeManager({
			forcedTheme: "light",
			isThemeForcedAttribute: "data-is-theme-forced",
		});

		const result = getSSRAttributes(themeManager);

		expect(result["data-is-theme-forced"]).toBe("true");
	});

	it("adds system theme attribute when enabled", () => {
		const themeManager = createThemeManager({
			systemThemes: {
				kind: "enabled",
			},
			useSystemTheme: true,
			isSystemThemeAttribute: "data-is-system-theme",
		});

		const result = getSSRAttributes(themeManager);

		expect(result["data-is-system-theme"]).toBe("true");
	});

	it("adds color-scheme style when enabled", () => {
		const themeManager = createThemeManager({
			useColorScheme: true,
		});

		const result = getSSRAttributes(themeManager);

		expect(result.style).toBe("color-scheme: light;");
	});

	it("combines multiple attributes correctly", () => {
		const themeManager = createThemeManager({
			attributes: ["class", "data-theme"],
			useColorScheme: true,
			isThemeForcedAttribute: "data-is-theme-forced",
			isSystemThemeAttribute: "data-is-system-theme",
		});

		const result = getSSRAttributes(themeManager);

		expect(result.class).toBe("light");
		expect(result["data-theme"]).toBe("light");
		expect(result["data-is-theme-forced"]).toBeUndefined();
		expect(result["data-is-system-theme"]).toBe("true");
		expect(result.style).toBe("color-scheme: light;");
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
