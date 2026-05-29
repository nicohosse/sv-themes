import { describe, expect, it, vi } from "vitest";
import { createThemes, DEFAULT_THEMES } from "$lib/index.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { setCookie } from "$lib/utils/cookie.js";
import { getThemeScript, safeSerializeArgument, type ThemeScriptArguments, themeScript } from "./script.js";
import { STORAGE_METHOD_PRIORITY, type SystemThemes } from "./theme-manager/index.js";

describe("themeScript", () => {
	const themes = DEFAULT_THEMES;
	const themeIds = Object.keys(DEFAULT_THEMES) as (keyof typeof DEFAULT_THEMES)[];
	const systemThemes: SystemThemes<typeof themes> = {
		kind: "disabled",
	};

	it("applies the initial theme when no storage or forced theme is present", () => {
		themeScript(themes, themeIds, systemThemes, false, "light", "light", ["class"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.classList.contains("light")).toBe(true);
	});

	it("doesnt add attribute and removes meta tags and color scheme if resolvedTheme is invalid", () => {
		let themeColorMetaElement: HTMLMetaElement | null = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);

		let colorSchemeMetaElement: HTMLMetaElement | null = document.createElement("meta");
		colorSchemeMetaElement.name = "color-scheme";
		document.head.appendChild(colorSchemeMetaElement);

		themeScript(
			themes,
			themeIds,
			systemThemes,
			false,
			"missing",
			"missing",
			["class", "data-theme"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			true,
			true,
		);

		expect(document.documentElement.classList.contains("missing")).toBe(false);
		expect(document.documentElement.getAttribute("data-theme")).toBeNull();
		expect(document.documentElement.style.colorScheme).toBe("");

		themeColorMetaElement = document.querySelector('meta[name="theme-color"]');
		expect(themeColorMetaElement).toBeNull();

		colorSchemeMetaElement = document.querySelector('meta[name="color-scheme"]');
		expect(colorSchemeMetaElement).toBeNull();
	});

	it("doesnt duplicate meta tags", () => {
		const themeColorMetaElement: HTMLMetaElement | null = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);

		const colorSchemeMetaElement: HTMLMetaElement | null = document.createElement("meta");
		colorSchemeMetaElement.name = "color-scheme";
		document.head.appendChild(colorSchemeMetaElement);

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
			true,
		);

		const themeColorMetaElements = document.querySelectorAll('meta[name="theme-color"]');
		expect(themeColorMetaElements.length).toBe(1);

		const colorSchemeMetaElements = document.querySelectorAll('meta[name="color-scheme"]');
		expect(colorSchemeMetaElements.length).toBe(1);
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

		const systemThemes: SystemThemes<typeof themes> = {
			kind: "enabled",
			mappings: { light: "light", dark: "dark" },
		};

		themeScript(themes, themeIds, systemThemes, true, "light", "light", ["class"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("ignores system theme if disabled", () => {
		themeScript(themes, themeIds, systemThemes, true, "dark", "dark", ["class"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("applies theme via custom attributes", () => {
		themeScript(themes, themeIds, systemThemes, false, "dark", "dark", ["data-theme"], STORAGE_METHOD_PRIORITY);

		expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
	});

	it("sets color-scheme style if enabled", () => {
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
	});

	it("creates or updates the color-scheme meta tag with light dark content if enabled", () => {
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

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("light dark");
	});

	it("creates or updates the color-scheme meta tag with dark light content if enabled", () => {
		const themes = createThemes([
			{ id: "dark", type: "dark" },
			{ id: "light", type: "light" },
		]);

		themeScript(
			themes,
			Object.keys(themes),
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

	it("creates or updates the color-scheme meta tag with light content when there is no dark theme if enabled", () => {
		const lightOnlyThemes = createThemes([{ id: "light", type: "light" }]);

		themeScript(
			lightOnlyThemes,
			Object.keys(lightOnlyThemes),
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			true,
		);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("light");
	});

	it("creates or updates the color-scheme meta tag with dark content when there is no light theme if enabled", () => {
		const darkOnlyThemes = createThemes([{ id: "dark", type: "dark" }]);

		themeScript(
			darkOnlyThemes,
			Object.keys(darkOnlyThemes),
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

	it("creates or updates theme-color using hex format when useThemeColor is true", () => {
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

	it("creates or updates non-hex theme-color if color can be resolved when useThemeColor is true", () => {
		const themes = createThemes([{ id: "light", type: "light", color: "white" }]);

		themeScript(
			themes,
			Object.keys(themes),
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			true,
		);

		const meta = document.querySelector('meta[name="theme-color"]');

		expect(meta?.getAttribute("content")).toBe("rgb(255, 255, 255)");
	});

	it("removes theme-color meta tag if theme doesnt have a color assigned", () => {
		const themes = createThemes([{ id: "nature", type: "light" }]);

		let themeColorMetaElement: HTMLMetaElement | null = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);

		themeScript(
			themes,
			Object.keys(themes),
			systemThemes,
			false,
			"nature",
			"nature",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			true,
		);

		themeColorMetaElement = document.querySelector('meta[name="theme-color"]');

		expect(themeColorMetaElement).toBeNull();
	});

	it("removes meta tag if non-hex theme-color cannot be resolved", () => {
		const themes = createThemes([{ id: "light", type: "light", color: "var(--missing)" }]);

		let themeColorMetaElement: HTMLMetaElement | null = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);

		themeScript(
			themes,
			Object.keys(themes),
			systemThemes,
			false,
			"light",
			"light",
			["class"],
			STORAGE_METHOD_PRIORITY,
			undefined,
			false,
			true,
		);

		themeColorMetaElement = document.querySelector('meta[name="theme-color"]');

		expect(themeColorMetaElement).toBeNull();
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
		const systemThemes: SystemThemes<typeof themes> = {
			kind: "enabled",
			mappings: { light: "light", dark: "dark" },
		};

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
