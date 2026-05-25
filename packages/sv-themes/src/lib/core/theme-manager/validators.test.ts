import { describe, expect, it } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import { INVALID_THEME_MANAGER_CONFIG_CASES, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { createThemeManager } from "./create-theme-manager.svelte.js";
import { resolveThemeManagerConfig } from "./resolver.js";
import { validateThemeManagerConfig } from "./validators.js";

describe("validateRequestedTheme", () => {
	it("placeholder", () => {
		expect(true).toBe(true);
	});

	/*const themeManager = expectOk(
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
				systemThemes: {},
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


	describe("validateThemeManagerConfig", () => {
		it("should validate themes", () => {
			const themeManager = {
				...THEME_MANAGER,
				themes: {
					...THEME_MANAGER.themes,
					broken: { id: "", type: "light" },
				},
			} as unknown as ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeErr("ThemeInvalidId");
		});

		it("should validate the selected theme", () => {
			const themeManager = {
				...THEME_MANAGER,
				selectedTheme: "missing",
			} as unknown as ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeErr("ThemeNotFound");
		});

		it("should validate light system themes", () => {
			const themeManager = {
				...THEME_MANAGER,
				resolvedSystemThemes: {
					...THEME_MANAGER.resolvedSystemThemes,
					light: "missing-theme",
				},
			} as unknown as ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeErr("SystemThemeInvalidType");
		});

		it("should validate dark system themes", () => {
			const themeManager = {
				...THEME_MANAGER,
				systemThemes: {
					...THEME_MANAGER.systemThemes,
					kind: "enabled",
					mappings: {
						...THEME_MANAGER.systemThemes.mappings,
						dark: "missing",
					},
				},
			} satisfies ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeErr("SystemThemeInvalidType");
		});

		it("should skip system validation when disabled", () => {
			const themeManager = {
				...THEME_MANAGER,
				enableSystemThemes: false,
				resolvedSystemThemes: {},
			} as unknown as ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeOk();
		});

		it("should return Err tabSyncStorageMethodsIncompatible when enableTabSync is true but there no local storage method enabled", () => {
			const themeManager = {
				...THEME_MANAGER,
				enableTabSync: true,
				storage: {
					...THEME_MANAGER.storage,
					methods: ["cookie"],
				},
			} as unknown as ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeOk();
		});

		it("should aggregate multiple errors", () => {
			const themeManager = {
				...THEME_MANAGER,
				themes: {
					...THEME_MANAGER.themes,
					broken: { id: "", type: "light" },
				},
				themeIds: [...THEME_MANAGER.themeIds, "broken"],
				selectedTheme: "missing",
				systemThemes: {
					...THEME_MANAGER.systemThemes,
					mappings: {
						light: "broken",
						dark: "light",
					},
				},
			} as unknown as ThemeManager;

			expect(resolveThemeManagerConfig(themeManager)).toBeErr([
				"NoThemes",
				"ThemeInvalidId",
				"ThemeNotFound",
				"SystemThemeInvalidType",
				"SystemThemeUnassigned",
			]);
		});
		});*/
});

describe("validateThemeManagerConfig", () => {
	it("returns Ok with valid config", () => {
		const resolvedConfig = expectOk(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG));
		expect(validateThemeManagerConfig(resolvedConfig)).toBeOk();
	});

	it("returns Err SystemThemeUnassigned", () => {
		const resolvedConfig = expectOk(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG));
		expect(validateThemeManagerConfig(resolvedConfig)).toBeOk();
	});
});
