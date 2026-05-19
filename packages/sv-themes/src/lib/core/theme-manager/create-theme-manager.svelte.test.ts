import { describe, expect, it } from "vitest";
import { createThemeManager, INVALID_THEME_MANAGER_CONFIG_CASES } from "$lib/tests/theme-manager.js";

describe("createThemeManager", () => {
	it("should return Ok with valid config", () => {
		createThemeManager();
	});

	it.each(INVALID_THEME_MANAGER_CONFIG_CASES)("should reject: $name", ({ config, expectedError }) => {
		expect(createThemeManager(config)).toBeErr(expectedError);
	});
});
