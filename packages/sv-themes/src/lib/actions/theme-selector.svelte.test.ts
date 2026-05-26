import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { createThemeManager, ThemeManagerError } from "$lib/index.js";
import { expectOk } from "$lib/tests/setup.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { themeSelector } from "./theme-selector.svelte.js";

describe("themeSelector", () => {
	it("registers a click event listener and sets initial state", () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "light",
				themeManager,
			});

			flushSync();

			expect(node.onclick).not.toBeUndefined();
			expect(node.ariaPressed).toBe("true");

			action.destroy?.();
		});

		cleanup();
	});

	describe("getResolvedThemeId", () => {
		it("resolves to system theme mapping when theme is 'system' and systemThemes is enabled with an active system theme", () => {
			const node = document.createElement("button");

			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ useSystemTheme: true }, false)));

			const cleanup = $effect.root(() => {
				const action = themeSelector(node, {
					theme: "system",
					themeManager,
				});

				flushSync();

				expect(node.ariaPressed).toBe("true");

				action.destroy?.();
			});

			cleanup();
		});

		it("resolves to 'system' when theme is 'system' but systemThemes kind is disabled", () => {
			const node = document.createElement("button");

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
							systemThemes: {
								kind: "disabled",
							},
						},
						false,
					),
				),
			);

			const cleanup = $effect.root(() => {
				const action = themeSelector(node, {
					theme: "system",
					themeManager,
				});

				flushSync();

				expect(node.ariaPressed).toBe("false");

				action.destroy?.();
			});

			cleanup();
		});

		it("resolves to the static theme ID when theme is not 'system'", () => {
			const node = document.createElement("button");

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const cleanup = $effect.root(() => {
				const action = themeSelector(node, {
					theme: "light",
					themeManager,
				});

				flushSync();

				expect(node.ariaPressed).toBe("true");

				action.destroy?.();
			});

			cleanup();
		});
	});

	it("calls setTheme on the themeManager when clicked and succeeds", async () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManager, "setTheme");

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "dark",
				themeManager,
			});

			flushSync();

			node.click();

			action.destroy?.();
		});

		await vi.waitFor(() => expect(themeManager.setTheme).toHaveBeenCalledWith("dark"));

		cleanup();
	});

	it("logs an error to console when setTheme fails", async () => {
		const node = document.createElement("button");

		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "missing" as never,
				themeManager,
			});

			flushSync();

			node.click();

			action.destroy?.();
		});

		await vi.waitFor(() =>
			expect(consoleErrorSpy).toHaveBeenCalledWith(ThemeManagerError.themeNotFound("missing").message),
		);

		cleanup();
	});

	it("sets ariaPressed to 'true' if themeId is 'system' and useSystemTheme is true", () => {
		const node = document.createElement("button");

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

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "system",
				themeManager,
			});

			flushSync();

			expect(node.ariaPressed).toBe("true");

			action.destroy?.();
		});

		cleanup();
	});

	it("sets ariaPressed to 'true' if the initialTheme matches the resolvedThemeId", () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "light",
				themeManager,
			});

			flushSync();

			expect(node.ariaPressed).toBe("true");

			action.destroy?.();
		});

		cleanup();
	});

	it("sets ariaPressed to 'false' if none of the active criteria are met", () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "dark",
				themeManager,
			});

			flushSync();

			expect(node.ariaPressed).toBe("false");

			action.destroy?.();
		});

		cleanup();
	});

	it("updates parameters and recalculates state on update", () => {
		const node = document.createElement("button");

		const lightThemeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
		const darkThemeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						initialTheme: "dark",
					},
					false,
				),
			),
		);

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "light",
				themeManager: lightThemeManager,
			});

			flushSync();

			expect(node.ariaPressed).toBe("true");

			action.update?.({
				theme: "dark",
				themeManager: darkThemeManager,
			});

			flushSync();

			expect(node.ariaPressed).toBe("true");

			action.destroy?.();
		});

		cleanup();
	});

	it("removes the click event listener on destroy", async () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManager, "setTheme");

		const cleanup = $effect.root(() => {
			const action = themeSelector(node, {
				theme: "dark",
				themeManager,
			});

			flushSync();

			action.destroy?.();
		});

		node.click();

		await vi.waitFor(() => expect(themeManager.setTheme).not.toHaveBeenCalled());

		cleanup();
	});
});
