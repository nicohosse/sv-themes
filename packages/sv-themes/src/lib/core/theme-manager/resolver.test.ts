import { describe, expect, it } from "vitest";
import { MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { resolveThemeManagerConfig } from "./resolver.js";

describe("resolveThemeManagerConfig", () => {
	it("should return Ok if the theme manager is valid", () => {
		expect(resolveThemeManagerConfig(MOCK_THEME_MANAGER_CONFIG)).toBeOk();
	});
});
