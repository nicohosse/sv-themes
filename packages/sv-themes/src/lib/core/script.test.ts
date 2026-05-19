import { describe, expect, it, vi } from "vitest";
import { DEFAULT_THEMES, type ThemeRecord } from "$lib/index.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { setCookie } from "$lib/utils/cookie.js";
import { getThemeScript, safeSerializeArgument, type ThemeScriptArguments, themeScript } from "./script.js";
import { STORAGE_METHOD_PRIORITY, type SystemThemes } from "./theme-manager/index.js";

describe("themeScript", () => {
	const themes = DEFAULT_THEMES;
	const themeIds = Object.keys(DEFAULT_THEMES) as (keyof typeof DEFAULT_THEMES)[];
	const systemThemes: SystemThemes<typeof themes> = {
		kind: "enabled",
		mappings: { light: "light", dark: "dark" },
	};

	it("applies the initial theme when no storage or forced theme is present", () => {
		themeScript(themes, themeIds, systemThemes, false, "light", "light", ["class"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.classList.contains("light")).toBe(true);
	});

	it("retrieves theme from localStorage", () => {
		localStorage.setItem("theme", "dark");

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			undefined,
			undefined,
			{ methods: ["localStorage"], key: "theme", cookie: { name: "theme" } },
		);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("retrieves theme from sessionStorage", () => {
		sessionStorage.setItem("theme", "dark");

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			undefined,
			undefined,
			{ methods: ["sessionStorage"], key: "theme", cookie: { name: "theme" } },
		);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("retrieves theme from cookies", async () => {
		await setCookie("dark", { name: "theme" });

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			undefined,
			undefined,
			{ methods: ["cookie"], key: "theme", cookie: { name: "theme" } },
		);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("skips invalid or missing storage entries", () => {
		localStorage.setItem("theme", "invalid-theme");

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			undefined,
			undefined,
			{ methods: ["localStorage"], key: "theme", cookie: { name: "theme" } },
		);

		expect(document.documentElement.classList.contains("light")).toBe(true);
	});

	it("handles system theme resolution when enabled", () => {
		testEnv().systemTheme("dark").apply();

		themeScript(themes, themeIds, systemThemes, true, "light", "light", ["class"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("ignores system theme if disabled", () => {
		themeScript(themes, themeIds, { kind: "disabled" }, true, "dark", "dark", ["class"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("applies theme via custom attributes", () => {
		themeScript(themes, themeIds, systemThemes, false, "dark", "dark", ["data-theme"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
	});

	it("sets color-scheme style and sets meta tag to light dark when dark and light themes exist", () => {
		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			true,
		);

		expect(document.documentElement.style.colorScheme).toBe("light");

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("light dark");
	});

	it("sets meta tag to dark light when first theme is dark", () => {
		themeScript(
			themes,
			["dark", "light"],
			systemThemes,
			false,
			"dark",
			"dark",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			true,
		);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("dark light");
	});

	it("sets meta tag to dark when no light themes exist", () => {
		const darkOnlyThemes: ThemeRecord = {
			dark: { id: "dark", type: "dark" },
		};

		themeScript(
			darkOnlyThemes,
			["dark"],
			systemThemes,
			false,
			"dark",
			"dark",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			true,
		);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("dark");
	});

	it("sets theme-color meta tag when useThemeColor is true", () => {
		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"dark",
			"dark",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			true,
		);

		const meta = document.querySelector('meta[name="theme-color"]');

		expect(meta?.getAttribute("content")).toBe("#000");
	});

	it("handles forced theme attribute", () => {
		const attribute = "data-is-theme-forced";

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			"dark",
			false,
			false,
			attribute,
		);

		expect(document.documentElement.getAttribute(attribute)).toBe("true");

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			attribute,
		);

		expect(document.documentElement.hasAttribute(attribute)).toBe(false);
	});

	it("handles system theme attribute", () => {
		const attribute = "data-is-system-theme";

		themeScript(
			themes,
			themeIds,
			systemThemes,
			true,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			undefined,
			attribute,
		);

		expect(document.documentElement.getAttribute(attribute)).toBe("true");

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			false,
			undefined,
			attribute,
		);

		expect(document.documentElement.hasAttribute(attribute)).toBe(false);
	});

	it("removes the current script tag if it exists", () => {
		const script = document.createElement("script");
		document.body.appendChild(script);

		vi.spyOn(document, "currentScript", "get").mockReturnValue(script);

		themeScript(themes, themeIds, systemThemes, false, "light", "light", [], STORAGE_METHOD_PRIORITY);

		expect(script.parentNode).toBeNull();
	});
});

describe("getThemeScript", () => {
	const config: ThemeScriptArguments = {
		themes: { light: { id: "light", type: "light" } },
		themeIds: ["light"],
		systemThemes: { kind: "disabled" },
		useSystemTheme: false,
		initialTheme: "light",
		selectedTheme: "light",
		attributes: ["class"],
		storage: { methods: ["localStorage"], key: "theme", cookie: { name: "theme" } },
		forcedTheme: undefined,
	} as const;

	it("serializes the theme configuration", () => {
		const args = [
			config.themes,
			config.themeIds,
			config.systemThemes,
			config.useSystemTheme,
			config.initialTheme,
			config.selectedTheme,
			config.attributes,
			STORAGE_METHOD_PRIORITY,
			config.forcedTheme,
			config.useColorScheme,
			config.useThemeColor,
			config.isThemeForcedAttribute,
			config.isSystemThemeAttribute,
			config.storage,
		]
			.map((argument) => (argument === undefined ? "undefined" : safeSerializeArgument(argument)))
			.join(",");

		expect(getThemeScript(config)).toContain(args);
	});

	it("removes minification name wrappers from the function string", () => {
		const originalToString = Function.prototype.toString;

		vi.spyOn(Function.prototype, "toString").mockImplementation(function (this: (...args: never[]) => unknown) {
			return this === themeScript
				? 'function themeScript() { __name(themeScript, "themeScript"); }'
				: originalToString.call(this);
		});

		const script = getThemeScript(config);

		expect(script).not.toContain("__name");
	});

	it("handles undefined optional arguments in serialization", () => {
		const script = getThemeScript(config);
		const parts = script.split(",");

		expect(parts[parts.length - 6]).toBe("undefined");
	});
});

describe("safeSerializeArgument", () => {
	it("stringifies standard objects", () => {
		const argument = { key: "value", num: 123 };
		expect(safeSerializeArgument(argument)).toBe('{"key":"value","num":123}');
	});

	it("escapes script tags to prevent injection in HTML blocks", () => {
		expect(safeSerializeArgument("</script>")).toContain("<\\/script>");
		expect(safeSerializeArgument("</script  >")).toContain("<\\/script>");
		expect(safeSerializeArgument("<  / script >")).toContain("<\\/script>");
	});

	it("escapes HTML comments", () => {
		const argument = "<!-- secret -->";
		expect(safeSerializeArgument(argument)).toContain("<\\!--");
	});

	it("escapes other closing tags", () => {
		const argument = "</div></sv-themes>";
		const result = safeSerializeArgument(argument);

		expect(result).toContain("<\\div");
		expect(result).toContain("<\\sv-themes");
	});
});
