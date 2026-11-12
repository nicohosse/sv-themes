import { describe, expect, it } from "vitest";
import { testEnv } from "#lib/tests/testEnvironment.js";
import {
	getResolverElement,
	normalizeColorToHex,
	oklchToRgb,
	parseRgb,
	resolveCssColor,
	rgbToHex,
} from "./resolveCssColor.js";

describe("getResolverElement", () => {
	it("should get or create and append a hidden resolver element", () => {
		const resolverElement = getResolverElement();

		expect(resolverElement).toBeDefined();

		if (!resolverElement) throw new Error("Expected resolver element to exist.");

		expect(resolverElement.tagName).toBe("DIV");
		expect(resolverElement.style.display).toBe("none");
		expect(document.body.contains(resolverElement)).toBe(true);
	});

	it("should return undefined when in a non-browser environment", () => {
		testEnv().browser(false).apply();
		expect(getResolverElement()).toBeUndefined();
	});
});

describe("resolveCssColor", () => {
	it("should return an Err when resolverElement is undefined", () => {
		testEnv().browser(false).apply();

		expect(resolveCssColor("red").isErr()).toBe(true);
	});

	it("should resolve regular css colors", () => {
		expect(resolveCssColor("red")._unsafeUnwrap()).toBe("#ff0000");
	});

	it("should resolve css variables", () => {
		document.documentElement.style.setProperty("--primary", "red");

		expect(resolveCssColor("var(--primary)")._unsafeUnwrap()).toBe("#ff0000");
	});

	it("should resolve fallback values", () => {
		expect(resolveCssColor("var(--missing, blue)")._unsafeUnwrap()).toBe("#0000ff");
	});

	it("should return an Err when variable is missing and fallback is disabled", () => {
		expect(
			resolveCssColor("var(--missing, blue)", {
				allowFallback: false,
			}).isErr(),
		).toBe(true);
	});

	it("should return an Err for missing variable without fallback", () => {
		expect(resolveCssColor("var(--missing)").isErr()).toBe(true);
	});

	it("should handle whitespace in fallback", () => {
		expect(resolveCssColor("var(--missing,   red   )")._unsafeUnwrap()).toBe("#ff0000");
	});

	it("should preserve alpha as an 8-digit hex value", () => {
		expect(resolveCssColor("rgba(255, 0, 0, 0.5)")._unsafeUnwrap()).toBe("#ff000080");
	});

	it("should return an Err for unsupported colors", () => {
		expect(resolveCssColor("not-a-real-color").isErr()).toBe(true);
	});
});

describe("rgbToHex", () => {
	it("should convert normalized RGB values (0 to 1) to a hex string", () => {
		expect(rgbToHex(1, 0, 0)).toBe("#ff0000");
		expect(rgbToHex(0, 1, 0)).toBe("#00ff00");
		expect(rgbToHex(0, 0, 1)).toBe("#0000ff");
		expect(rgbToHex(0.5, 0.5, 0.5)).toBe("#808080");
	});

	it("should clamp values outside the 0 to 1 range", () => {
		expect(rgbToHex(-0.5, 1.5, 0.5)).toBe("#00ff80");
	});

	it("should append alpha when the color is translucent", () => {
		expect(rgbToHex(1, 0, 0, 0.5)).toBe("#ff000080");
		expect(rgbToHex(1, 0, 0, 0)).toBe("#ff000000");
		expect(rgbToHex(1, 0, 0, 1)).toBe("#ff0000");
	});
});

describe("oklchToRgb", () => {
	it("should convert oklch string to normalized RGB array", () => {
		expect(oklchToRgb("oklch(1 0 0)")).toEqual([expect.closeTo(1), expect.closeTo(1), expect.closeTo(1), 1]);
	});

	it("should handle percentages and deg units", () => {
		expect(oklchToRgb("oklch(100% 0 0deg)")).toEqual([expect.closeTo(1), expect.closeTo(1), expect.closeTo(1), 1]);
	});

	it("should preserve alpha", () => {
		expect(oklchToRgb("oklch(1 0 0 / 40%)")).toEqual([
			expect.closeTo(1),
			expect.closeTo(1),
			expect.closeTo(1),
			expect.closeTo(0.4),
		]);
	});

	it("should handle scientific notation", () => {
		expect(oklchToRgb("oklch(1 1e-7 0)")).toEqual([expect.closeTo(1), expect.closeTo(1), expect.closeTo(1), 1]);
	});

	it("should return undefined for non-matching strings", () => {
		expect(oklchToRgb("invalid-oklch-format")).toBeUndefined();
	});
});

describe("parseRgb", () => {
	it("should parse rgb/rgba color strings into normalized RGB components", () => {
		const [r1, g1, b1, a1] = parseRgb("rgb(255, 0, 127)") ?? [];
		expect(r1).toBe(1);
		expect(g1).toBe(0);
		expect(b1).toBeCloseTo(127 / 255);
		expect(a1).toBe(1);

		const [r2, g2, b2, a2] = parseRgb("rgba(0, 255, 0, 0.5)") ?? [];
		expect(r2).toBe(0);
		expect(g2).toBe(1);
		expect(b2).toBe(0);
		expect(a2).toBe(0.5);
	});

	it("should parse modern rgb syntax with a slash alpha", () => {
		expect(parseRgb("rgb(255 0 0 / 25%)")).toEqual([1, 0, 0, 0.25]);
	});

	it("should return undefined for invalid input formats", () => {
		expect(parseRgb("invalid-rgb-format")).toBeUndefined();
	});
});

describe("normalizeColorToHex", () => {
	it("should return an Err when resolverElement is undefined", () => {
		testEnv().browser(false).apply();
		expect(normalizeColorToHex("red").isErr()).toBe(true);
	});

	it("should normalize named colors", () => {
		expect(normalizeColorToHex("red")._unsafeUnwrap()).toBe("#ff0000");
	});

	it("should normalize hex colors", () => {
		expect(normalizeColorToHex("#000")._unsafeUnwrap()).toBe("#000000");
	});

	it("should normalize rgb colors", () => {
		expect(normalizeColorToHex("rgb(255, 0, 0)")._unsafeUnwrap()).toBe("#ff0000");
	});

	it("should normalize oklch colors", () => {
		expect(normalizeColorToHex("oklch(1 0 0)")._unsafeUnwrap()).toBe("#ffffff");
	});

	it("resets the resolverElement's color", () => {
		expect(resolveCssColor("red").isOk()).toBe(true);
		expect(getResolverElement()?.style.color).toBe("");
	});
});
