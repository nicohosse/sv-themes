import { flushSync, mount, unmount } from "svelte";
import { describe, expect, it, vi } from "vitest";
import * as themeManagerContextModule from "#lib/contexts/themeManagerContext.svelte.js";
import type { ThemeRecord } from "#lib/core/theme/theme.js";
import { createThemeManager } from "#lib/core/themeManager/index.js";
import { ThemeManagerError } from "#lib/index.js";
import { expectOk } from "#lib/tests/setup.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "#lib/tests/themeManager.js";
import ThemeSelectorFixture from "./tests/ThemeSelector.fixture.svelte";
import { type ThemeSelectorParams, themeSelector } from "./themeSelector.svelte.js";

function attach<Themes extends ThemeRecord>(node: HTMLButtonElement, params: ThemeSelectorParams<Themes>): () => void {
	let detach: (() => void) | undefined;

	const cleanup = $effect.root(() => {
		const teardown = themeSelector(params)(node);

		if (typeof teardown === "function") detach = teardown;
	});

	flushSync();

	return () => {
		detach?.();
		cleanup();
	};
}

describe("themeSelector", () => {
	it("attaches a click event listener and sets initial state", () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = attach(node, {
			theme: "light",
		});

		expect(node.onclick).not.toBeUndefined();
		expect(node.ariaPressed).toBe("true");

		destroy();
	});

	describe("getResolvedThemeId", () => {
		it("resolves to system theme mapping when theme is 'system' and systemThemes is enabled with an active system theme", () => {
			const node = document.createElement("button");

			const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ useSystemTheme: true }, false)));

			vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

			const destroy = attach(node, {
				theme: "system",
			});

			expect(node.ariaPressed).toBe("true");

			destroy();
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

			vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

			const destroy = attach(node, {
				theme: "system",
			});

			expect(node.ariaPressed).toBe("false");

			destroy();
		});

		it("resolves to the static theme ID when theme is not 'system'", () => {
			const node = document.createElement("button");

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

			const destroy = attach(node, {
				theme: "light",
			});

			expect(node.ariaPressed).toBe("true");

			destroy();
		});
	});

	it("calls setTheme on the themeManager when clicked and succeeds", async () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);
		vi.spyOn(themeManager, "setTheme");

		const destroy = attach(node, {
			theme: "dark",
		});

		node.click();

		await vi.waitFor(() => expect(themeManager.setTheme).toHaveBeenCalledWith("dark"));

		destroy();
	});

	it("logs an error to console when setTheme fails", async () => {
		const node = document.createElement("button");

		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = attach(node, {
			theme: "missing" as never,
		});

		node.click();

		await vi.waitFor(() =>
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining(ThemeManagerError.themeNotFound("missing").message),
			),
		);

		destroy();
	});

	it("calls onError callback when setTheme fails", async () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const onError = vi.fn();

		const destroy = attach(node, {
			theme: "missing",
			onError,
		});

		node.click();

		await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));

		destroy();
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

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = attach(node, {
			theme: "system",
		});

		expect(node.ariaPressed).toBe("true");

		destroy();
	});

	it("sets ariaPressed to 'true' if the initialTheme matches the resolvedThemeId", () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = attach(node, {
			theme: "light",
		});

		expect(node.ariaPressed).toBe("true");

		destroy();
	});

	it("sets ariaPressed to 'false' if none of the active criteria are met", () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = attach(node, {
			theme: "dark",
		});

		expect(node.ariaPressed).toBe("false");

		destroy();
	});

	it("keeps the system and theme buttons mutually exclusive", async () => {
		const systemNode = document.createElement("button");
		const lightNode = document.createElement("button");
		const darkNode = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = [
			attach(systemNode, { theme: "system" }),
			attach(lightNode, { theme: "light" }),
			attach(darkNode, { theme: "dark" }),
		];

		expect(systemNode.ariaPressed).toBe("false");
		expect(lightNode.ariaPressed).toBe("true");
		expect(darkNode.ariaPressed).toBe("false");

		expect(await themeManager.setTheme("system")).toBeOk();

		flushSync();

		expect(systemNode.ariaPressed).toBe("true");
		expect(lightNode.ariaPressed).toBe("false");
		expect(darkNode.ariaPressed).toBe("false");

		for (const detach of destroy) detach();
	});

	it("sets only the active theme button to pressed when a theme is selected", async () => {
		const lightNode = document.createElement("button");
		const darkNode = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		const destroy = [attach(lightNode, { theme: "light" }), attach(darkNode, { theme: "dark" })];

		expect(await themeManager.setTheme("dark")).toBeOk();

		flushSync();

		expect(lightNode.ariaPressed).toBe("false");
		expect(darkNode.ariaPressed).toBe("true");

		for (const detach of destroy) detach();
	});

	it("re-applies when reactive parameters change", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const component = mount(ThemeSelectorFixture, { target: document.body, props: { themeManager } });

		flushSync();

		const themeButton = document.querySelector<HTMLButtonElement>("#theme-button");

		expect(themeButton?.ariaPressed).toBe("true");

		document.querySelector<HTMLButtonElement>("#toggle-theme")?.click();

		flushSync();

		expect(themeButton?.ariaPressed).toBe("false");

		unmount(component);
	});

	it("removes the click event listener on destroy", async () => {
		const node = document.createElement("button");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockReturnValue(themeManager);

		vi.spyOn(themeManager, "setTheme");

		const destroy = attach(node, {
			theme: "dark",
		});

		destroy();

		node.click();

		await vi.waitFor(() => expect(themeManager.setTheme).not.toHaveBeenCalled());
	});

	it("removes the click event listener when the owning component unmounts", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManager, "setTheme");

		const component = mount(ThemeSelectorFixture, { target: document.body, props: { themeManager } });

		flushSync();

		const themeButton = document.querySelector<HTMLButtonElement>("#theme-button");

		unmount(component);

		themeButton?.click();

		await vi.waitFor(() => expect(themeManager.setTheme).not.toHaveBeenCalled());
	});
});
