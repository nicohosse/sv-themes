import { describe, expect, it } from "vitest";
import { testEnv } from "$lib/tests/test-environment.js";
import { getResolverElement, normalizeColor, resolveCssColor } from "./resolve-css-color.js";

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
	it("should return undefined when resolverElement is undefined", () => {
		testEnv().browser(false).apply();
		expect(resolveCssColor("red")).toBeUndefined();
	});

	it("should resolve regular css colors", () => {
		expect(resolveCssColor("red")).toBe("rgb(255, 0, 0)");
	});

	it("should resolve css variables", () => {
		document.documentElement.style.setProperty("--primary", "red");

		expect(resolveCssColor("var(--primary)")).toBe("rgb(255, 0, 0)");
	});

	it("should resolve fallback values", () => {
		expect(resolveCssColor("var(--missing, blue)")).toBe("rgb(0, 0, 255)");
	});

	it("should return undefined when variable is missing and fallback is disabled", () => {
		expect(
			resolveCssColor("var(--missing, blue)", {
				allowFallback: false,
			}),
		).toBeUndefined();
	});

	it("should return undefined for missing variable without fallback", () => {
		expect(resolveCssColor("var(--missing)")).toBeUndefined();
	});

	it("should handle whitespace in fallback", () => {
		expect(resolveCssColor("var(--missing,   red   )")).toBe("rgb(255, 0, 0)");
	});
});

describe("normalizeColor", () => {
	it("should throw when resolverElement is undefined", () => {
		testEnv().browser(false).apply();
		expect(() => normalizeColor("red")).toThrow("No DOM available for color resolution.");
	});

	it("should normalize named colors", () => {
		expect(normalizeColor("red")).toBe("rgb(255, 0, 0)");
	});

	it("should normalize hex colors", () => {
		expect(normalizeColor("#000")).toBe("rgb(0, 0, 0)");
	});

	it("should normalize rgb colors", () => {
		expect(normalizeColor("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
	});
});
