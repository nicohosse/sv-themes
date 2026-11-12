import * as svelteModule from "svelte";
import { describe, expect, it, vi } from "vitest";
import { createThemeManager } from "$lib/core/theme-manager/create-theme-manager.svelte.js";
import { ThemeManagerError } from "$lib/core/theme-manager/errors.js";
import { expectOk } from "$lib/tests/setup.js";
import { MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { getThemeManager, isThemeManagerRegistered, setThemeManager } from "./theme-manager-context.svelte.js";

describe("isThemeManagerRegistered", () => {
	it("returns true if theme manager is registered in context", () => {
		vi.spyOn(svelteModule, "hasContext").mockReturnValue(true);

		expect(isThemeManagerRegistered()).toBe(true);
	});

	it("returns false if theme manager is not registered in context", () => {
		vi.spyOn(svelteModule, "hasContext").mockReturnValue(false);

		expect(isThemeManagerRegistered()).toBe(false);
	});
});

describe("getThemeManager", () => {
	it("throws Err NotRegistered if no theme manager is registered in context", () => {
		vi.spyOn(svelteModule, "hasContext").mockReturnValue(false);

		expect(() => getThemeManager()).toThrow(ThemeManagerError.notRegistered.message);
	});

	it("returns theme manager if its is registered in context", () => {
		vi.spyOn(svelteModule, "hasContext").mockReturnValue(true);
		vi.spyOn(svelteModule, "getContext").mockReturnValue({});

		expect(getThemeManager()).not.toBeUndefined();
	});
});

describe("setThemeManager", () => {
	it("returns Ok and sets theme manager if no other manager is registered in context", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(svelteModule, "hasContext").mockReturnValue(false);
		vi.spyOn(svelteModule, "setContext").mockImplementation(() => {});

		expect(setThemeManager(themeManager)).toBeOk();
	});

	it("returns Err AlreadyRegistered if a theme manager is already registered in context", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(svelteModule, "hasContext").mockReturnValue(true);

		expect(setThemeManager(themeManager)).toBeErr(ThemeManagerError.alreadyRegistered);
	});
});
