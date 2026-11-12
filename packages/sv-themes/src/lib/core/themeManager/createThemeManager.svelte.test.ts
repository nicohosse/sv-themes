import { ok } from "neverthrow";
import * as svelte from "svelte";
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { THEME_MANAGER_CONTEXT_SYMBOL } from "$lib/contexts/theme-manager-context.svelte.js";
import { createThemes } from "$lib/index.js";
import { expectOk } from "$lib/tests/setup.js";
import {
	createMockThemeManagerConfig,
	INVALID_THEME_MANAGER_CONFIG_CASES,
	MOCK_THEME_MANAGER_CONFIG,
} from "$lib/tests/theme-manager.js";
import { createAppThemeManager, createThemeManager } from "./create-theme-manager.svelte.js";
import * as domModule from "./dom.svelte.js";
import { ThemeManagerError } from "./errors.js";
import * as persistenceModule from "./persistence.js";
import { INTERNAL as THEME_MANAGER_INTERNAL } from "./theme-manager.js";

describe("createThemeManager", () => {
	it("returns Ok with valid config", () => {
		expect(createThemeManager(MOCK_THEME_MANAGER_CONFIG)).toBeOk();
	});

	it("should have identical themes and themeIds keys", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		expect(Object.keys(themeManager.themes)).toEqual(themeManager.themeIds);
	});

	it.each(INVALID_THEME_MANAGER_CONFIG_CASES)("rejects: $name", ({ config, expectedError }) => {
		expect(createThemeManager(config)).toBeErr(expectedError);
	});

	it("correctly derives resolvedUseSystemTheme and resolvedTheme based on state and config", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						useSystemTheme: true,
					},
					false,
				),
			),
		);

		expect(themeManager.resolvedUseSystemTheme).toBe(true);
		expect(themeManager.resolvedTheme).toBe("light");
	});

	it("derives resolvedUseSystemTheme as true when forcedTheme is system", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		expect(await themeManager.setForcedTheme("system")).toBeOk();

		expect(themeManager.resolvedUseSystemTheme).toBe(true);
	});

	it("identifies availability of light and dark themes", () => {
		const lightOnly = createThemes([{ id: "light", type: "light" }]);

		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({ themes: lightOnly, systemThemes: { kind: "disabled" } }, false),
			),
		);

		expect(themeManager.hasLightTheme).toBe(true);
		expect(themeManager.hasDarkTheme).toBe(false);
	});

	describe("setUseSystemTheme", () => {
		it("returns Err SystemThemesDisabled when system themes are disabled and useSystemTheme is true", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "disabled" },
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager.setUseSystemTheme(true);

			flushSync();

			expect(result).toBeErr(ThemeManagerError.systemThemesDisabled.id);
		});

		it("returns Err ForcedThemeActive when a forced theme is set and ignoreForcedTheme is disabled", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			expect(await themeManager.setForcedTheme("light")).toBeOk();

			flushSync();

			const result = await themeManager.setUseSystemTheme(true);

			flushSync();

			expect(result).toBeErr(ThemeManagerError.forcedThemeActive);
		});

		it("sets useSystemTheme correctly when system themes are enabled", async () => {
			const config = createMockThemeManagerConfig({
				systemThemes: { kind: "enabled" },
				useSystemTheme: false,
			});

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager.setUseSystemTheme(true);

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(true);
		});

		it("emits select event when theme has been selected", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const selectHandler = vi.fn();
			themeManager.on("select", selectHandler);

			await themeManager.setUseSystemTheme(true);

			expect(selectHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "light",
					to: "system",
				}),
			);

			await themeManager.setUseSystemTheme(false);

			expect(selectHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "system",
					to: "light",
				}),
			);
		});

		it("sets useSystemTheme when ignoreForcedTheme is enabled even when a forced theme is active", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			expect(await themeManager.setForcedTheme("light")).toBeOk();

			flushSync();

			expect(themeManager.forcedTheme).toBe("light");

			const result = await themeManager.setUseSystemTheme(true, { ignoreForcedTheme: true });

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(true);
		});

		it("cancels transition if select handler calls preventDefault", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			themeManager.on("select", (event) => {
				event.preventDefault();
			});

			const result = await themeManager.setUseSystemTheme(true);

			expect(result).toBeErr(ThemeManagerError.cancelled.id);
			expect(themeManager.useSystemTheme).toBe(false);
		});
	});

	describe("setSelectedTheme", () => {
		it("updates the selectedTheme when theme is valid", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager.setSelectedTheme("dark");

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.selectedTheme).toBe("dark");
		});

		it("returns Err ThemeNotFound when theme is invalid", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager.setSelectedTheme("invalid" as unknown as "light" | "dark");

			flushSync();

			expect(result).toBeErr("ThemeNotFound");
		});

		it("returns Err ForcedThemeActive when a forced theme is set and ignoreForcedTheme is disabled", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			expect(await themeManager.setForcedTheme("light")).toBeOk();

			flushSync();

			const result = await themeManager.setSelectedTheme("dark");

			flushSync();

			expect(result).toBeErr(ThemeManagerError.forcedThemeActive);
		});

		it("emits select event when theme has been selected", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const selectHandler = vi.fn();
			themeManager.on("select", selectHandler);

			await themeManager.setSelectedTheme("dark");

			expect(selectHandler).toHaveBeenCalledWith(
				expect.objectContaining({
					from: "light",
					to: "dark",
				}),
			);
		});

		it("sets selected theme when ignoreForcedTheme is enabled even when a forced theme is active", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			expect(await themeManager.setForcedTheme("light")).toBeOk();

			flushSync();

			expect(themeManager.forcedTheme).toBe("light");

			const result = await themeManager.setSelectedTheme("dark", { ignoreForcedTheme: true });

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(false);
			expect(themeManager.selectedTheme).toBe("dark");
		});

		it("cancels transition if select handler calls preventDefault", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			themeManager.on("select", (event) => {
				event.preventDefault();
			});

			const result = await themeManager.setSelectedTheme("dark");

			expect(result).toBeErr(ThemeManagerError.cancelled.id);
			expect(themeManager.selectedTheme).toBe("light");
		});
	});

	describe("transitionTheme", () => {
		it("skips transition if from and to are identical", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager[THEME_MANAGER_INTERNAL].transitionTheme("light", () => ok(), false);

			expect(result).toBeOk();
		});

		it("cancels transition if beforeChange handler calls preventDefault", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

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

		it("persists theme only when config.shouldPersist is true", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const persistMock = vi.spyOn(persistenceModule, "persistTheme");

			await themeManager.setTheme("dark", { shouldPersist: false });

			expect(persistMock).not.toHaveBeenCalled();

			await themeManager.setTheme("light");

			expect(persistMock).toHaveBeenCalledWith(themeManager, "light");
		});

		it("emits afterChange event following successful transition", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const afterChangeHandler = vi.fn();
			themeManager.on("afterChange", afterChangeHandler);

			expect(await themeManager.setTheme("dark")).toBeOk();

			expect(afterChangeHandler).toHaveBeenCalledWith({
				from: "light",
				to: "dark",
			});
		});
	});

	describe("setForcedTheme", () => {
		it("returns Err ForcedThemeLocked if forced theme is locked", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
			themeManager.isForcedThemeLocked = true;

			const result = await themeManager.setForcedTheme("dark");

			flushSync();

			expect(result).toBeErr("ForcedThemeLocked");
		});

		it("locks forced theme when shouldLock is true", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager.setForcedTheme("dark", true);

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.isForcedThemeLocked).toBe(true);
		});

		it("skips forced theme update if target matches current forced theme", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
			await themeManager.setForcedTheme("dark");

			const result = await themeManager.setForcedTheme("dark");

			flushSync();

			expect(result).toBeOk();
		});

		it("returns Err SystemThemesDisabled when target is system and system themes are disabled", async () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
							systemThemes: { kind: "disabled" },
						},
						false,
					),
				),
			);

			const result = await themeManager.setForcedTheme("system");

			flushSync();

			expect(result).toBeErr("SystemThemesDisabled");
		});

		it("clears forcedTheme and emits unforced event when target is undefined", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			await themeManager.setForcedTheme("dark");

			const unforcedHandler = vi.fn();
			themeManager.on("unforced", unforcedHandler);

			const result = await themeManager.setForcedTheme(undefined);

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.forcedTheme).toBeUndefined();
			expect(unforcedHandler).toHaveBeenCalled();
		});

		it("applies forced theme and emits forced event when target is valid", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const forcedHandler = vi.fn();
			themeManager.on("forced", forcedHandler);

			const result = await themeManager.setForcedTheme("dark");

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.forcedTheme).toBe("dark");
			expect(forcedHandler).toHaveBeenCalledWith({ theme: "dark" });
		});

		it("returns validation error for invalid target theme ID", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager.setForcedTheme("invalid" as unknown as "light" | "dark");

			flushSync();

			expect(result).toBeErr("ThemeNotFound");
		});
	});

	describe("setTheme", () => {
		it("enables system theme use when target is system", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager.setTheme("system");

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(true);
		});

		it("disables system theme use and selects target theme when target is specific theme ID", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await themeManager.setTheme("dark");

			flushSync();

			expect(result).toBeOk();
			expect(themeManager.useSystemTheme).toBe(false);
			expect(themeManager.selectedTheme).toBe("dark");
		});
	});

	describe("setSystemTheme", () => {
		it("returns Err SystemThemesDisabled if system themes are disabled", async () => {
			const config = createMockThemeManagerConfig(
				{
					systemThemes: { kind: "disabled" },
				},
				false,
			);

			const themeManager = expectOk(createThemeManager(config));

			const result = await themeManager[THEME_MANAGER_INTERNAL].setSystemTheme("light");

			flushSync();

			expect(result).toBeErr(ThemeManagerError.systemThemesDisabled.id);
		});

		it("sets systemTheme and emits systemChange event when system themes are enabled", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const systemChangeHandler = vi.fn();
			themeManager.on("systemChange", systemChangeHandler);

			const result = await themeManager[THEME_MANAGER_INTERNAL].setSystemTheme("dark");

			flushSync();

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
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
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
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			await expect(themeManager[THEME_MANAGER_INTERNAL].emit("forced", { theme: "dark" })).resolves.toBeUndefined();
		});

		it("sequentially executes all registered handlers", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
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
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = themeManager[THEME_MANAGER_INTERNAL].hasListeners("forced");

			expect(result).toBe(false);
		});

		it("returns true when listeners exist for the specified event", () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			themeManager.on("forced", () => {});

			const result = themeManager[THEME_MANAGER_INTERNAL].hasListeners("forced");

			expect(result).toBe(true);
		});
	});
});

describe("createAppThemeManager", () => {
	it("returns Err when config is invalid", () => {
		const result = createAppThemeManager(
			createMockThemeManagerConfig(
				{
					useSystemTheme: true,
					systemThemes: { kind: "disabled" },
				},
				false,
			),
		);

		expect(result).toBeErr("SystemThemesDisabled");
	});

	it("returns Ok with valid config", () => {
		const result = createAppThemeManager(MOCK_THEME_MANAGER_CONFIG);

		expect(result).toBeOk();
	});

	it("creates theme manager and returns themeManager object, and getThemeManager and registerThemeManager functions", () => {
		const result = createAppThemeManager(MOCK_THEME_MANAGER_CONFIG);

		expect(result).toBeOk();

		const { themeManager, getThemeManager, registerThemeManager } = expectOk(result);

		expect(themeManager).toBeTypeOf("object");
		expect(getThemeManager).toBeTypeOf("function");
		expect(registerThemeManager).toBeTypeOf("function");
	});

	describe("registerThemeManager", () => {
		it("returns Err AlreadyRegistered error if a theme manager is already registered", () => {
			const hasContextSpy = vi.spyOn(svelte, "hasContext").mockReturnValue(true);

			const createManagerResult = expectOk(createAppThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = createManagerResult.registerThemeManager();

			expect(result).toBeErr(ThemeManagerError.alreadyRegistered.id);
			expect(hasContextSpy).toHaveBeenCalledWith(THEME_MANAGER_CONTEXT_SYMBOL);
		});

		it("sets context and registers in DOM when not registered", () => {
			const hasContextSpy = vi.spyOn(svelte, "hasContext").mockReturnValue(false);
			const setContextSpy = vi.spyOn(svelte, "setContext").mockImplementation(() => {});
			const registerThemeManagerSpy = vi.spyOn(domModule, "registerThemeManager");

			const createManagerResult = expectOk(createAppThemeManager(MOCK_THEME_MANAGER_CONFIG));

			$effect.root(() => {
				const result = createManagerResult.registerThemeManager();

				expect(result).toBeOk();
				expect(hasContextSpy).toHaveBeenCalledWith(THEME_MANAGER_CONTEXT_SYMBOL);
				expect(setContextSpy).toHaveBeenCalledWith(THEME_MANAGER_CONTEXT_SYMBOL, expect.any(Object));
				expect(registerThemeManagerSpy).toHaveBeenCalledWith(expect.any(Object));
			});
		});
	});
});
