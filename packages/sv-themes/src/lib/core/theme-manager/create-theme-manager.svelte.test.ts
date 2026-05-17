import { expect, it } from "vitest";
import { createValidThemeManager, VALID_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { createThemeManager } from "./create-theme-manager.svelte.js";

it("should initialize successfully with valid config", () => {
	createValidThemeManager();
});

it("should return Err when initialized with an invalid initialTheme", () => {
	expect(
		createThemeManager({
			...VALID_THEME_MANAGER_CONFIG,
			// @ts-expect-error testing
			initialTheme: "invalid-theme",
		}),
	).toBeErr("ThemeNotFound");
});
