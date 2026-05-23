import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { createThemes } from "../theme/theme.js";
import type { ThemeManagerConfig } from "./create-theme-manager.svelte.js";
import { ThemeManagerError } from "./errors.js";
import { resolveSystemThemes, resolveThemeManagerConfig } from "./resolver.js";

describe("resolveSystemThemes", () => {
	it("should return disabled system themes when not configured", () => {
		expect(
			resolveSystemThemes(
				createMockThemeManagerConfig(
					{
						systemThemes: undefined,
					},
					false,
				),
			),
		).toEqual(
			ok({
				kind: "disabled",
			}),
		);
	});

	it("should return disabled system themes when explicitly disabled", () => {
		expect(
			resolveSystemThemes(
				createMockThemeManagerConfig(
					{
						systemThemes: {
							kind: "disabled",
						},
					},
					false,
				),
			),
		).toEqual(
			ok({
				kind: "disabled",
			}),
		);
	});

	it("should automatically resolve light and dark mappings from theme types", () => {
		const result = resolveSystemThemes(MOCK_THEME_MANAGER_CONFIG);

		expect(result).toBeOk();

		if (result.isOk()) {
			expect(result.value).toEqual({
				kind: "enabled",
				mappings: {
					light: "light",
					dark: "dark",
				},
			});
		}
	});

	it("should prefer explicit mappings over inferred mappings", () => {
		const themes = expectOk(
			createThemes([
				{
					id: "nature",
					type: "light",
				},
			]),
		);

		const result = resolveSystemThemes(
			createMockThemeManagerConfig({
				themes,
				systemThemes: {
					kind: "enabled",
					mappings: {
						light: "nature",
					},
				},
			}),
		);

		expect(result).toEqual(
			ok({
				kind: "enabled",
				mappings: {
					light: "nature",
					dark: "dark",
				},
			}),
		);
	});

	it("should return an error if no light theme can be resolved", () => {
		const darkOnlyThemes = expectOk(
			createThemes([
				{
					id: "dark",
					type: "dark",
				},
			]),
		);

		const result = resolveSystemThemes(createMockThemeManagerConfig({ themes: darkOnlyThemes }, false));

		expect(result).toEqual(err(ThemeManagerError.systemThemeUnassigned("light")));
	});

	it("should return an error if no dark theme can be resolved", () => {
		const lightOnlyThemes = expectOk(
			createThemes([
				{
					id: "light",
					type: "light",
				},
			]),
		);

		const result = resolveSystemThemes(createMockThemeManagerConfig({ themes: lightOnlyThemes }, false));

		expect(result).toEqual(err(ThemeManagerError.systemThemeUnassigned("dark")));
	});

	it("should return an error if an invalid theme is provided", () => {
		const result = resolveSystemThemes(
			createMockThemeManagerConfig(
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
		);

		expect(result).toEqual(err(ThemeManagerError.systemThemeUnassigned("light")));
	});

	it("should allow partially explicit mappings and infer the rest", () => {
		const result = resolveSystemThemes(
			createMockThemeManagerConfig(
				{
					systemThemes: {
						kind: "enabled",
						mappings: {
							light: "light",
						},
					},
				},
				false,
			),
		);

		expect(result).toEqual(
			ok({
				kind: "enabled",
				mappings: {
					light: "light",
					dark: "dark",
				},
			}),
		);
	});
});

describe("resolveThemeManagerConfig", () => {
	it("should return Ok if the theme manager is valid", () => {
		expect(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG)).toBeOk();
	});

	it("should propagate system theme resolution errors", () => {
		const result = resolveThemeManagerConfig(
			createMockThemeManagerConfig({
				systemThemes: {
					kind: "enabled",
					mappings: {
						dark: "missing",
					},
				},
			}),
		);

		expect(result).toEqual(err(ThemeManagerError.systemThemeUnassigned("dark")));
	});
});
