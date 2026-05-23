import { describe, expect, it, vi } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import { createMockThemeManagerConfig } from "$lib/tests/theme-manager.js";
import { createThemeManager } from "./create-theme-manager.svelte.js";

describe("Theme Manager", () => {
	it("should have identical themes and themeIds keys", () => {
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

		expect(Object.keys(themeManager.themes)).toEqual(themeManager.themeIds);
	});

	it("should transition themes and emit events correctly", async () => {
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

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
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

		themeManager.on("beforeChange", (event) => {
			event.preventDefault();
		});

		const transitionResult = await themeManager.setTheme("dark", false);

		expect(transitionResult).toBeErr("Cancelled");
		expect(themeManager.resolvedTheme).toBe("light");
	});

	it("should lock forced themes correctly", async () => {
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

		await themeManager.setForcedTheme("dark", true);
		expect(themeManager.resolvedTheme).toBe("dark");
		expect(themeManager.isForcedThemeLocked).toBe(true);

		const overrideResult = await themeManager.setForcedTheme("light");

		expect(overrideResult).toBeErr("ForcedThemeLocked");
		expect(themeManager.resolvedTheme).toBe("dark");
	});
});
