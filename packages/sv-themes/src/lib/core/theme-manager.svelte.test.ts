import { describe, expect, it } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import type { Theme } from "./theme.js";
import {
	createThemeManager,
	createThemes,
	DEFAULT_THEMES,
	type ThemeManager,
	validateRequestedTheme,
	validateSystemTheme,
	validateTheme,
	validateThemeManager,
} from "./theme-manager.svelte.js";

const VALID_THEME_MANAGER = expectOk(
	createThemeManager({
		themes: DEFAULT_THEMES,
		initialTheme: "light",
		enableSystemThemes: true,
	}),
);

describe("createThemes", () => {
	it("should transform a unique theme array into a valid ThemesRecord", () => {
		const input = [
			{ id: "light", type: "light" as const },
			{ id: "dark", type: "dark" as const },
		];

		const themes = expectOk(createThemes(input));

		expect(themes).toEqual({
			light: input[0],
			dark: input[1],
		});
	});

	it("should return Err DuplicateTheme when multiple themes share the same ID", () => {
		expect(
			createThemes([
				{ id: "light", type: "light" },
				{ id: "light", type: "light" },
			]),
		).toBeErr("DuplicateTheme");
	});
});

describe("validateRequestedTheme", () => {
	const themeManager = expectOk(
		createThemeManager({
			themes: DEFAULT_THEMES,
			initialTheme: "light",
		}),
	);

	it("should return Ok for an existing theme ID", () => {
		expect(validateRequestedTheme(themeManager, "dark")).toBeOk();
	});

	it("should return Err ThemeNotFound for a non-existent ID", () => {
		// @ts-expect-error testing
		expect(validateRequestedTheme(themeManager, "missing")).toBeErr("ThemeNotFound");
	});
});

describe("validateSystemTheme", () => {
	it("should return Ok for a valid theme", () => {
		const themeManager = expectOk(
			createThemeManager({
				themes: DEFAULT_THEMES,
				initialTheme: "light",
				enableSystemThemes: true,
			}),
		);

		expect(validateSystemTheme(themeManager, "light")).toBeOk();
	});

	it("should return Err InvalidType for a theme of the opposite type", () => {
		const themes = expectOk(
			createThemes([
				{ id: "light", type: "light" },
				{ id: "dark", type: "light" },
			]),
		);

		const themeManager = {
			themes,
			initialTheme: "light",
			enableSystemThemes: true,
			hasLightSystemTheme: true,
			hasDarkSystemTheme: true,
			resolvedSystemThemes: { light: "light", dark: "dark" },
		} as unknown as ThemeManager;

		expect(validateSystemTheme(themeManager, "dark")).toBeErr("SystemThemeInvalidType");
	});

	it("should return Err SystemThemeUnassigned if the registry is missing that type", () => {
		const lightOnly = expectOk(createThemes([{ id: "light", type: "light" }]));

		const themeManager = {
			themes: lightOnly,
			initialTheme: "light",
			enableSystemThemes: true,
			hasLightSystemTheme: true,
			hasDarkSystemTheme: false,
			resolvedSystemThemes: { light: "light" },
		} as unknown as ThemeManager;

		expect(validateSystemTheme(themeManager, "dark")).toBeErr("SystemThemeUnassigned");
	});
});

describe("validateTheme", () => {
	it("should return Ok if the theme is valid", () => {
		const theme: Theme = {
			id: "light",
			type: "light",
		};

		expect(validateTheme(theme)).toBeOk();
	});

	it("should return Err ThemeInvalidId if the id is 'system'", () => {
		const theme: Theme = {
			id: "system",
			type: "light",
		};

		expect(validateTheme(theme)).toBeErr("ThemeInvalidId");
	});

	it("should return Err ThemeInvalidId if the id is empty", () => {
		const theme: Theme = {
			id: "",
			type: "light",
		};

		expect(validateTheme(theme)).toBeErr("ThemeInvalidId");
	});
});

describe("validateThemeManager", () => {
	it("should return Ok if the theme manager is valid", () => {
		expect(validateThemeManager(VALID_THEME_MANAGER)).toBeOk();
	});

	it("should validate themes", () => {
		const themeManager = {
			...VALID_THEME_MANAGER,
			themes: {
				...VALID_THEME_MANAGER.themes,
				broken: { id: "", type: "light" },
			},
		} as unknown as ThemeManager;

		expect(validateThemeManager(themeManager)).toBeErr("ThemeInvalidId");
	});

	it("should validate the selected theme", () => {
		const themeManager = {
			...VALID_THEME_MANAGER,
			selectedTheme: "does-not-exist",
		} as unknown as ThemeManager;

		expect(validateThemeManager(themeManager)).toBeErr("ThemeNotFound");
	});

	it("should validate light system themes", () => {
		const themeManager = {
			...VALID_THEME_MANAGER,
			hasLightSystemTheme: true,
			resolvedSystemThemes: {
				...VALID_THEME_MANAGER.resolvedSystemThemes,
				light: "missing-theme",
			},
		} as unknown as ThemeManager;

		expect(validateThemeManager(themeManager)).toBeErr("SystemThemeInvalidType");
	});

	it("should validate dark system themes", () => {
		const themeManager = {
			...VALID_THEME_MANAGER,
			resolvedSystemThemes: {
				...VALID_THEME_MANAGER.resolvedSystemThemes,
				dark: "missing-theme",
			},
		} as unknown as ThemeManager;

		expect(validateThemeManager(themeManager)).toBeErr("SystemThemeInvalidType");
	});

	it("should skip system validation when disabled", () => {
		const themeManager = {
			...VALID_THEME_MANAGER,
			enableSystemThemes: false,
			hasLightSystemTheme: false,
			hasDarkSystemTheme: false,
			resolvedSystemThemes: {},
		} as unknown as ThemeManager;

		expect(validateThemeManager(themeManager)).toBeOk();
	});

	it("should aggregate multiple errors", () => {
		const themeManager = {
			...VALID_THEME_MANAGER,
			themes: {
				...VALID_THEME_MANAGER.themes,
				broken: { id: "", type: "light" },
			},
			themeIds: [...VALID_THEME_MANAGER.themeIds, "broken"],
			selectedTheme: "missing",
			hasLightSystemTheme: false,
			resolvedSystemThemes: {
				...VALID_THEME_MANAGER.resolvedSystemThemes,
				light: "broken",
			},
		} as unknown as ThemeManager;

		expect(validateThemeManager(themeManager)).toBeErr([
			"NoThemes",
			"ThemeInvalidId",
			"ThemeNotFound",
			"SystemThemeUnassigned",
		]);
	});
});

/*
it("should initialize successfully with valid config", () => {
	expectOk(
		createThemeManager({
			themes: DEFAULT_THEMES,
			initialTheme: "light",
			enableSystemThemes: true,
		}),
	);
});

it("should return Err when initialized with an invalid initialTheme", () => {
	const result = createThemeManager({
		themes: DEFAULT_THEMES,
		// @ts-expect-error testing
		initialTheme: "invalid-theme",
	});

	expect(result).toBeErr("ThemeNotFound");
});

it("should transition themes and emit events correctly", async () => {
	const themeManager = createThemeManager({
		themes: DEFAULT_THEMES,
		initialTheme: "light",
	})._unsafeUnwrap();

	const beforeChangeSpy = vi.fn();
	const afterChangeSpy = vi.fn();

	themeManager.on("beforeChange", beforeChangeSpy);
	themeManager.on("afterChange", afterChangeSpy);

	const transitionResult = await themeManager.setTheme("dark", false);

	expect(transitionResult).toBeOk();
	expect(themeManager.resolvedTheme).toBe("dark");
	expect(themeManager.selectedTheme).toBe("dark");

	expect(beforeChangeSpy).toHaveBeenCalledOnce();
	expect(afterChangeSpy).toHaveBeenCalledOnce();
	expect(afterChangeSpy).toHaveBeenCalledWith({ from: "light", to: "dark" });
});

it("should cancel theme transition if preventDefault is called", async () => {
	const themeManager = createThemeManager({
		themes: DEFAULT_THEMES,
		initialTheme: "light",
	})._unsafeUnwrap();

	themeManager.on("beforeChange", (event) => {
		event.preventDefault();
	});

	const transitionResult = await themeManager.setTheme("dark", false);

	expect(transitionResult).toBeErr("Cancelled");
	expect(themeManager.resolvedTheme).toBe("light");
});

it("should lock forced themes correctly", async () => {
	const themeManager = createThemeManager({
		themes: DEFAULT_THEMES,
		initialTheme: "light",
	})._unsafeUnwrap();

	await themeManager.setForcedTheme("dark", true);
	expect(themeManager.resolvedTheme).toBe("dark");
	expect(themeManager.isForcedThemeLocked).toBe(true);

	const overrideResult = await themeManager.setForcedTheme("light");

	expect(overrideResult).toBeErr("ForcedThemeLocked");
	expect(themeManager.resolvedTheme).toBe("dark");
});
*/
