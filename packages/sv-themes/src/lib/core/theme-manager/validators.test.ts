import { err } from "neverthrow";
import { describe, expect, it } from "vitest";
import { createThemes, DEFAULT_THEMES, type ThemeRecord } from "$lib/index.js";
import { expectOk } from "$lib/tests/setup.js";
import {
	createMockThemeManagerConfig,
	INVALID_THEME_MANAGER_CONFIG_CASES,
	MOCK_THEME_MANAGER_CONFIG,
} from "$lib/tests/theme-manager.js";
import { ThemeManagerError } from "./errors.js";
import { type ResolvedThemeManagerConfig, resolveThemeManagerConfig } from "./index.js";
import {
	validateRequestedTheme,
	validateSystemTheme,
	validateThemeManagerConfig,
	validateThemes,
} from "./validators.js";

describe("validateRequestedTheme", () => {
	it("returns Ok when the requested theme exists in themes", () => {
		const result = validateRequestedTheme(DEFAULT_THEMES, "light");

		expect(result).toBeOk();
	});

	it("returns Err ThemeNotFound when the requested theme does not exist", () => {
		const themes = createThemes([{ id: "light", type: "light" }]);

		// @ts-expect-error testing
		const result = validateRequestedTheme(themes, "dark");

		expect(result).toBeErr(ThemeManagerError.themeNotFound("dark"));
	});
});

describe("validateSystemTheme", () => {
	it("returns Err SystemThemesDisabled when system themes are disabled", () => {
		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig(
					{
						systemThemes: { kind: "disabled" },
					},
					false,
				),
			),
		);

		const result = validateSystemTheme(config, "light");

		expect(result).toBeErr("SystemThemesDisabled");
	});

	it("returns Err SystemThemeUnassigned when the mapped theme doesnt exist", () => {
		const config = {
			...createMockThemeManagerConfig(
				{
					systemThemes: {
						kind: "enabled",
						mappings: {
							dark: "dark",
						},
					},
				},
				false,
			),
		} as ResolvedThemeManagerConfig<typeof DEFAULT_THEMES>;

		const result = validateSystemTheme(config, "light");

		expect(result).toBeErr(ThemeManagerError.systemThemeUnassigned("light"));
	});

	it("returns Err SystemThemeUnassigned when the mapped theme doesnt exist", () => {
		const config = {
			...createMockThemeManagerConfig(
				{
					systemThemes: {
						kind: "enabled",
						mappings: {
							light: "missing",
						},
					},
				},
				false,
			),
		} as ResolvedThemeManagerConfig<typeof DEFAULT_THEMES>;

		const result = validateSystemTheme(config, "light");

		expect(result).toBeErr(ThemeManagerError.systemThemeUnassigned("light"));
	});

	it("returns Err SystemThemeInvalidType when the mapped light theme is configured with a dark type", () => {
		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig(
					{
						systemThemes: {
							kind: "enabled",
							mappings: {
								light: "dark",
								dark: "light",
							},
						},
					},
					false,
				),
			),
		);

		const result = validateSystemTheme(config, "light");

		expect(result).toBeErr(ThemeManagerError.systemThemeInvalidType("light"));
	});

	it("returns Err SystemThemeInvalidType when the mapped dark theme is configured with a light type", () => {
		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig(
					{
						systemThemes: {
							kind: "enabled",
							mappings: {
								light: "dark",
								dark: "light",
							},
						},
					},
					false,
				),
			),
		);

		const result = validateSystemTheme(config, "dark");

		expect(result).toBeErr(ThemeManagerError.systemThemeInvalidType("dark"));
	});

	it("returns Ok when system themes mappings are configured correctly", () => {
		const config = expectOk(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG));

		expect(validateSystemTheme(config, "light")).toBeOk();
		expect(validateSystemTheme(config, "dark")).toBeOk();
	});
});

describe("validateThemes", () => {
	it("returns Ok for valid themes", () => {
		const config = expectOk(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG));

		expect(validateThemes(config)).toBeOk();
	});

	it("returns Err ThemeInvalidId when any theme ID is equivalent to 'system'", () => {
		const themes = createThemes([{ id: "system", type: "light" }]);

		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig({
					themes,
				}),
			),
		);

		const result = validateThemes(config);

		expect(result).toBeErr(ThemeManagerError.themeInvalidId("system"));
	});

	it("returns Err ThemeInvalidId when any theme ID is empty or whitespace only", () => {
		const themes = createThemes([{ id: "   ", type: "light" }]);

		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig({
					themes,
				}),
			),
		);

		const result = validateThemes(config);

		expect(result).toBeErr(ThemeManagerError.themeInvalidId("   "));
	});

	it("returns Err NoThemes when no themes are provided", () => {
		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig(
					{
						themes: {},
						systemThemes: { kind: "disabled" },
					},
					false,
				),
			),
		);

		const result = validateThemes(config);

		expect(result).toBeErr(ThemeManagerError.noThemes);
	});

	it("returns Err DuplicateTheme when multiple themes declare identical IDs", () => {
		const anotherDarkTheme: ThemeRecord = {
			anotherDark: { id: "dark", type: "dark" },
		};

		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig({
					themes: anotherDarkTheme,
				}),
			),
		);

		const result = validateThemes(config);

		expect(result).toBeErr(ThemeManagerError.duplicateTheme("dark"));
	});
});

describe("validateThemeManagerConfig", () => {
	it("returns Ok for a valid config", () => {
		const config = expectOk(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG));

		expect(validateThemeManagerConfig(config)).toBeOk();
	});

	it("aggregates multiple config errors", () => {
		const themes: ThemeRecord = {
			dark: { id: "dark", type: "dark" },
			anotherDark: { id: "dark", type: "dark" },
		};

		const config = expectOk(
			resolveThemeManagerConfig(
				createMockThemeManagerConfig(
					{
						themes,
						initialTheme: "missing",
						systemThemes: { kind: "disabled" },
						useSystemTheme: true,
						storage: {
							methods: ["cookie"],
							key: "theme",
							cookie: { name: "theme" },
						},
					},
					false,
				),
			),
		);

		const result = validateThemeManagerConfig(config);

		expect(result).toBeErr([
			ThemeManagerError.duplicateTheme("dark"),
			ThemeManagerError.themeNotFound("missing"),
			ThemeManagerError.systemThemesDisabled,
			ThemeManagerError.tabSyncStorageMethodsIncompatible,
		]);
	});

	it.each(INVALID_THEME_MANAGER_CONFIG_CASES)("rejects: $name", ({ config, expectedError }) => {
		expect(validateThemeManagerConfig(config as ResolvedThemeManagerConfig)).toBeErr(expectedError);
	});
});
