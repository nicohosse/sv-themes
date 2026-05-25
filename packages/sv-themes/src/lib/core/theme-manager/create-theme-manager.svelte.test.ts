import { describe, expect, it, vi } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import {
	createMockThemeManagerConfig,
	INVALID_THEME_MANAGER_CONFIG_CASES,
	MOCK_THEME_MANAGER_CONFIG,
} from "$lib/tests/theme-manager.js";
import { createThemeManager, type ThemeManagerConfig } from "./create-theme-manager.svelte.js";
import { ThemeManagerError } from "./errors.js";
import * as persistenceModule from "./persistence.js";
import { INTERNAL as THEME_MANAGER_INTERNAL } from "./theme-manager.js";

describe("createThemeManager", () => {
	it("returns Ok with valid config", () => {
		expect(createThemeManager(MOCK_THEME_MANAGER_CONFIG)).toBeOk();
	});

	it.each(INVALID_THEME_MANAGER_CONFIG_CASES)("rejects: $name", ({ config, expectedError }) => {
		expect(createThemeManager(config)).toBeErr(expectedError);
	});

	it("correctly derives resolvedUseSystemTheme and resolvedTheme based on state and config", () => {
		const config = createMockThemeManagerConfig({
			systemThemes: {
				kind: "enabled",
				mappings: { light: "light", dark: "dark" },
			},
			useSystemTheme: true,
		});

		const themeManager = expectOk(createThemeManager(config));

		expect(themeManager.resolvedUseSystemTheme).toBe(true);
		expect(themeManager.resolvedTheme).toBe("light");
	});

	it("derives resolvedUseSystemTheme as true when forcedTheme is system", async () => {
		const config = createMockThemeManagerConfig({
			systemThemes: {
				kind: "enabled",
				mappings: { light: "light", dark: "dark" },
			},
			useSystemTheme: false,
		});

		const themeManager = expectOk(createThemeManager(config));

		await themeManager.setForcedTheme("system");

		expect(themeManager.resolvedUseSystemTheme).toBe(true);
	});

	it("identifies availability of light and dark themes", () => {
		const config: ThemeManagerConfig = {
			...MOCK_THEME_MANAGER_CONFIG,
			themes: {
				light: { id: "light", type: "light" },
			},
			initialTheme: "light",
			systemThemes: { kind: "disabled" },
		};

		const themeManager = expectOk(createThemeManager(config));

		expect(themeManager.hasLightTheme).toBe(true);
		expect(themeManager.hasDarkTheme).toBe(false);
	});

	describe("setUseSystemTheme", () => {
		it("returns error if system themes are disabled and useSystemTheme is true", () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "disabled" },
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = themeManager[THEME_MANAGER_INTERNAL].setUseSystemTheme(true);

			expect(result).toBeErr(ThemeManagerError.systemThemesDisabled.id);
		});

		it("sets useSystemTheme correctly when system themes are enabled", () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "enabled" },
				useSystemTheme: false,
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = themeManager[THEME_MANAGER_INTERNAL].setUseSystemTheme(true);

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(true);
		});
	});

	describe("setSelectedTheme", () => {
		it("updates the selectedTheme when theme is valid", () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			const result = themeManager[THEME_MANAGER_INTERNAL].setSelectedTheme("dark");

			expect(result).toBeOk();
			expect(themeManager.selectedTheme).toBe("dark");
		});

		it("returns error when theme is invalid", () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			const result = themeManager[THEME_MANAGER_INTERNAL].setSelectedTheme("invalid" as unknown as "light" | "dark");

			expect(result).toBeErr("ThemeNotFound");
		});
	});

	describe("transitionTheme", () => {
		it("skips transition if from and to are identical", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ initialTheme: "light" })));

			const result = await themeManager.setTheme("light");

			expect(result).toBeOk();
		});

		it("cancels transition if beforeChange handler calls preventDefault", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ initialTheme: "light" })));

			themeManager.on("beforeChange", (event) => {
				event.preventDefault();
			});

			const result = await themeManager.setTheme("dark");

			expect(result).toBeErr(ThemeManagerError.cancelled.id);
			expect(themeManager.resolvedTheme).toBe("light");
		});

		it("validates the requested theme and doesnt emit events when invalid", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			// @ts-expect-error testing
			const result = await themeManager.setTheme("missing");

			expect(result).toBeErr("ThemeNotFound");
		});

		it("propagates error when commit function fails", async () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig({
						systemThemes: { kind: "disabled" },
						initialTheme: "light",
					}),
				),
			);

			const result = await themeManager.setTheme("system");

			expect(result).toBeErr("SystemThemesDisabled");
		});

		it("persists theme only when shouldPersist is true", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ initialTheme: "light" })));

			const persistMock = vi.spyOn(persistenceModule, "persistTheme");

			await themeManager.setTheme("dark", false);

			expect(persistMock).not.toHaveBeenCalled();

			await themeManager.setTheme("light", true);

			expect(persistMock).toHaveBeenCalledWith(themeManager, "light");
		});

		it("emits afterChange event following successful transition", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ initialTheme: "light" })));

			const afterChangeHandler = vi.fn();
			themeManager.on("afterChange", afterChangeHandler);

			await themeManager.setTheme("dark");

			expect(afterChangeHandler).toHaveBeenCalledWith({
				from: "light",
				to: "dark",
			});
		});
	});

	describe("setForcedTheme", () => {
		it("returns error if forced theme is locked", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));
			themeManager.isForcedThemeLocked = true;

			const result = await themeManager.setForcedTheme("dark");

			expect(result).toBeErr("ForcedThemeLocked");
		});

		it("locks forced theme when shouldLock is true", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			const result = await themeManager.setForcedTheme("dark", true);

			expect(result).toBeOk();
			expect(themeManager.isForcedThemeLocked).toBe(true);
		});

		it("skips forced theme update if target matches current forced theme", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));
			await themeManager.setForcedTheme("dark");

			const result = await themeManager.setForcedTheme("dark");

			expect(result).toBeOk();
		});

		it("returns error if target is system and system themes are disabled", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "disabled" },
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager.setForcedTheme("system");

			expect(result).toBeErr("SystemThemesDisabled");
		});

		it("clears forcedTheme and emits unforced event when target is undefined", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			await themeManager.setForcedTheme("dark");

			const unforcedHandler = vi.fn();
			themeManager.on("unforced", unforcedHandler);

			const result = await themeManager.setForcedTheme(undefined);

			expect(result).toBeOk();
			expect(themeManager.forcedTheme).toBeUndefined();
			expect(unforcedHandler).toHaveBeenCalled();
		});

		it("applies forced theme and emits forced event when target is valid", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			const forcedHandler = vi.fn();
			themeManager.on("forced", forcedHandler);

			const result = await themeManager.setForcedTheme("dark");

			expect(result).toBeOk();
			expect(themeManager.forcedTheme).toBe("dark");
			expect(forcedHandler).toHaveBeenCalledWith({ theme: "dark" });
		});

		it("returns validation error for invalid target theme ID", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			const result = await themeManager.setForcedTheme("invalid" as unknown as "light" | "dark");

			expect(result).toBeErr("ThemeNotFound");
		});
	});

	describe("setTheme", () => {
		it("enables system theme use when target is system", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "enabled" },
				useSystemTheme: false,
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager.setTheme("system");

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(true);
		});

		it("disables system theme use and selects target theme when target is specific theme ID", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "enabled" },
				useSystemTheme: true,
				initialTheme: "light",
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager.setTheme("dark");

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(false);
			expect(themeManager.selectedTheme).toBe("dark");
		});
	});

	describe("setSystemTheme", () => {
		it("returns error if system themes are disabled", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "disabled" },
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager[THEME_MANAGER_INTERNAL].setSystemTheme("light");

			expect(result).toBeErr(ThemeManagerError.systemThemesDisabled.id);
		});

		it("sets systemTheme and emits systemChange event when system themes are enabled", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: {
					kind: "enabled",
					mappings: { light: "light", dark: "dark" },
				},
			});

			const themeManager = expectOk(createThemeManager(config));

			const systemChangeHandler = vi.fn();
			themeManager.on("systemChange", systemChangeHandler);

			const result = await themeManager[THEME_MANAGER_INTERNAL].setSystemTheme("dark");

			expect(result).toBeOk();
			expect(themeManager.systemThemes.kind === "enabled" && themeManager.systemThemes.systemTheme).toBe("dark");
			expect(systemChangeHandler).toHaveBeenCalledWith({
				systemTheme: "dark",
				resolvedSystemTheme: "dark",
			});
		});
	});

	describe("on", () => {
		it("registers handlers and returns a cleanup function that removes the registration", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));
			const handler = vi.fn();

			const unsubscribe = themeManager.on("forced", handler);
			await themeManager[THEME_MANAGER_INTERNAL].emit("forced", { theme: "dark" });

			expect(handler).toHaveBeenCalledTimes(1);

			unsubscribe();

			await themeManager[THEME_MANAGER_INTERNAL].emit("forced", { theme: "light" });

			expect(handler).toHaveBeenCalledTimes(1);
		});
	});

	describe("emit", () => {
		it("safely exits if no handlers are registered for the event", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			await expect(themeManager[THEME_MANAGER_INTERNAL].emit("forced", { theme: "dark" })).resolves.toBeUndefined();
		});

		it("sequentially executes all registered handlers", async () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));
			const executionOrder: string[] = [];

			themeManager.on("forced", async () => {
				executionOrder.push("first");
			});

			themeManager.on("forced", async () => {
				executionOrder.push("second");
			});

			await themeManager[THEME_MANAGER_INTERNAL].emit("forced", { theme: "dark" });

			expect(executionOrder).toEqual(["first", "second"]);
		});
	});

	describe("hasListeners", () => {
		it("returns false when no listeners exist for the specified event", () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			const result = themeManager[THEME_MANAGER_INTERNAL].hasListeners("forced");

			expect(result).toBe(false);
		});

		it("returns true when listeners exist for the specified event", () => {
			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig()));

			themeManager.on("forced", () => {});

			const result = themeManager[THEME_MANAGER_INTERNAL].hasListeners("forced");

			expect(result).toBe(true);
		});
	});
});
