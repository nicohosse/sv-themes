import { ok } from "neverthrow";
import { flushSync } from "svelte";
import { describe, expect, it, vi } from "vitest";
import { createThemes } from "$lib/index.js";
import { expectOk } from "$lib/tests/setup.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import {
	cleanupThemeClasses,
	createThemeManager,
	registerStorageListener,
	registerThemeManager,
	ThemeManagerError,
	updateAttributes,
	updateDom,
	updateMetaTags,
} from "./index.js";
import * as persistenceModule from "./persistence.js";
import { INTERNAL as THEME_MANAGER_INTERNAL } from "./theme-manager.js";

describe("updateMetaTags", () => {
	it("does nothing when not in browser environment", () => {
		testEnv().browser(false).apply();

		const querySelectorSpy = vi.spyOn(document, "querySelector");
		const createElementSpy = vi.spyOn(document, "createElement");

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		updateMetaTags(themeManager);

		expect(querySelectorSpy).not.toHaveBeenCalled();
		expect(createElementSpy).not.toHaveBeenCalled();
	});

	it("skips color-scheme meta tag if useColorScheme is false", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					useColorScheme: false,
				}),
			),
		);

		const originalColorSchemeMetaElement = document.querySelector('meta[name="color-scheme"]');

		updateMetaTags(themeManager);

		const colorSchemeMetaElement = document.querySelector('meta[name="color-scheme"]');

		expect(colorSchemeMetaElement).toEqual(originalColorSchemeMetaElement);
	});

	it("creates or updates the color-scheme meta tag with light dark content if enabled", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		updateMetaTags(themeManager);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("light dark");
	});

	it("creates or updates the color-scheme meta tag with dark light content if enabled", () => {
		const themes = createThemes([
			{ id: "dark", type: "dark" },
			{ id: "light", type: "light" },
		]);

		const themeManager = expectOk(createThemeManager({ ...MOCK_THEME_MANAGER_CONFIG, themes }));

		updateMetaTags(themeManager);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("dark light");
	});

	it("creates or updates the color-scheme with light content when there is no dark theme if enabled", () => {
		const themes = createThemes([{ id: "light", type: "light" }]);

		const themeManager = expectOk(createThemeManager({ themes, initialTheme: "light" }));

		updateMetaTags(themeManager);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("light");
	});

	it("creates or updates the color-scheme with dark content when there is no light theme if enabled", () => {
		const themes = createThemes([{ id: "dark", type: "dark" }]);

		const themeManager = expectOk(createThemeManager({ themes, initialTheme: "dark" }));

		updateMetaTags(themeManager);

		const meta = document.querySelector('meta[name="color-scheme"]');

		expect(meta?.getAttribute("content")).toBe("dark");
	});

	it("skips theme-color meta tag if useThemeColor is false", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					useThemeColor: false,
				}),
			),
		);

		const originalThemeColorMetaElement = document.querySelector('meta[name="theme-color"]');

		updateMetaTags(themeManager);

		const themeColorMetaElement = document.querySelector('meta[name="theme-color"]');

		expect(themeColorMetaElement).toEqual(originalThemeColorMetaElement);
	});

	it("removes theme-color meta tag if theme doesnt have a color assigned", () => {
		const themes = createThemes([{ id: "nature", type: "light" }]);

		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					themes,
					initialTheme: "nature",
				}),
			),
		);

		let themeColorMetaElement: HTMLMetaElement | null = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);

		updateMetaTags(themeManager);

		themeColorMetaElement = document.querySelector('meta[name="theme-color"]');

		expect(themeColorMetaElement).toBeNull();
	});

	it("updates theme-color using hex format", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		updateMetaTags(themeManager);

		const meta = document.querySelector('meta[name="theme-color"]');

		expect(meta?.getAttribute("content")).toBe("#fff");
	});

	it("updates non-hex theme-color if color can be resolved", () => {
		const themes = createThemes([{ id: "light", type: "light", color: "white" }]);

		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					themes,
				}),
			),
		);

		updateMetaTags(themeManager);

		const meta = document.querySelector('meta[name="theme-color"]');

		expect(meta?.getAttribute("content")).toBe("rgb(255, 255, 255)");
	});

	it("logs error and removes meta tag if non-hex theme-color cannot be resolved", () => {
		const themes = createThemes([{ id: "light", type: "light", color: "var(--missing)" }]);

		let themeColorMetaElement: HTMLMetaElement | null = document.createElement("meta");
		themeColorMetaElement.name = "theme-color";
		document.head.appendChild(themeColorMetaElement);

		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					themes,
				}),
			),
		);

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		updateMetaTags(themeManager);

		expect(consoleSpy).toHaveBeenCalledExactlyOnceWith(
			"The color of theme 'light' couldn't be resolved. Removing theme-color meta element.",
		);

		themeColorMetaElement = document.querySelector('meta[name="theme-color"]');

		expect(themeColorMetaElement).toBeNull();
	});
});

describe("cleanupThemeClasses", () => {
	it("removes all classes of inactive themes", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const lightThemeClassName = MOCK_THEME_MANAGER_CONFIG.themes.light.className ?? "light";
		const darkThemeClassName = MOCK_THEME_MANAGER_CONFIG.themes.dark.className ?? "dark";

		document.documentElement.classList.add(lightThemeClassName, darkThemeClassName);

		cleanupThemeClasses(themeManager);

		expect(document.documentElement.classList).toContain(lightThemeClassName);
		expect(document.documentElement.classList).not.toContain(darkThemeClassName);
	});
});

describe("updateAttributes", () => {
	it("adds the active theme class and removes all inactive ones", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const lightThemeClassName = MOCK_THEME_MANAGER_CONFIG.themes.light.className ?? "light";
		const darkThemeClassName = MOCK_THEME_MANAGER_CONFIG.themes.dark.className ?? "dark";

		document.documentElement.classList.add(lightThemeClassName, darkThemeClassName);

		updateAttributes(themeManager);

		expect(document.documentElement.classList).toContain(lightThemeClassName);
		expect(document.documentElement.classList).not.toContain(darkThemeClassName);
	});

	it("applies the color-scheme style property when enabled", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		updateAttributes(themeManager);

		expect(document.documentElement.style.colorScheme).toBe("light");
	});

	it("handles system theme attributes correctly", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					useSystemTheme: true,
				}),
			),
		);

		updateAttributes(themeManager);

		expect(document.documentElement.getAttribute("data-is-system-theme")).toBe("true");

		themeManager.setTheme(themeManager.selectedTheme);

		updateAttributes(themeManager);

		expect(document.documentElement.getAttribute("data-is-system-theme")).toBeNull();
	});

	it("handles forced theme attributes correctly", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					forcedTheme: "light",
				}),
			),
		);

		updateAttributes(themeManager);

		expect(document.documentElement.getAttribute("data-is-theme-forced")).toBe("true");

		themeManager.setForcedTheme(undefined);

		updateAttributes(themeManager);

		expect(document.documentElement.getAttribute("data-is-theme-forced")).toBeNull();
	});

	it("adds theme attributes", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		updateAttributes(themeManager);

		expect(document.documentElement.classList).toContain(MOCK_THEME_MANAGER_CONFIG.themes.light.className ?? "light");
		expect(document.documentElement.getAttribute("data-theme")).toBe("light");
	});
});

describe("updateDom", () => {
	it("updates both meta tags and attributes", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		updateDom(themeManager);

		const colorSchemeMetaElement = document.querySelector('meta[name="color-scheme"]');

		expect(colorSchemeMetaElement?.getAttribute("content")).toBe("light dark");
		expect(document.documentElement.classList).toContain("light");
	});
});

describe("registerStorageListener", () => {
	it("does nothing when not in browser environment", () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));
		const addEventListenerSpy = vi.spyOn(globalThis, "addEventListener");

		const cleanup = registerStorageListener(themeManager);
		cleanup();

		expect(addEventListenerSpy).not.toHaveBeenCalled();
	});

	it("does nothing when storage is disabled", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						enableTabSync: false,
						storage: undefined,
					},
					false,
				),
			),
		);

		const addEventListenerSpy = vi.spyOn(globalThis, "addEventListener");

		const cleanup = registerStorageListener(themeManager);
		cleanup();

		expect(addEventListenerSpy).not.toHaveBeenCalled();
	});

	it("does nothing when tab sync is disabled", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					enableTabSync: false,
				}),
			),
		);

		const addEventListenerSpy = vi.spyOn(globalThis, "addEventListener");

		const cleanup = registerStorageListener(themeManager);
		cleanup();

		expect(addEventListenerSpy).not.toHaveBeenCalled();
	});

	it("does nothing when neither local nor session storage methods are used", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						enableTabSync: false,
						storage: {
							methods: ["cookie"],
							key: "theme",
							cookie: { name: "theme" },
						},
					},
					false,
				),
			),
		);

		const addEventListenerSpy = vi.spyOn(globalThis, "addEventListener");

		const cleanup = registerStorageListener(themeManager);
		cleanup();

		expect(addEventListenerSpy).not.toHaveBeenCalled();
	});

	it("ignores storage events for other keys", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const setThemeSpy = vi.spyOn(themeManager, "setTheme");

		const cleanup = registerStorageListener(themeManager);

		globalThis.localStorage.setItem("not-theme", "dark");

		expect(setThemeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("ignores storage events from sessionStorage if only localStorage is enabled", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						storage: {
							methods: ["localStorage"],
							key: "theme",
							cookie: { name: "theme" },
						},
					},
					false,
				),
			),
		);

		const setThemeSpy = vi.spyOn(themeManager, "setTheme");

		const cleanup = registerStorageListener(themeManager);

		globalThis.sessionStorage.setItem("theme", "dark");

		expect(setThemeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("ignores storage events from localStorage if only sessionStorage is enabled", () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						enableTabSync: true,
						storage: {
							methods: ["sessionStorage"],
							key: "theme",
							cookie: { name: "theme" },
						},
					},
					false,
				),
			),
		);

		const setThemeSpy = vi.spyOn(themeManager, "setTheme");

		const cleanup = registerStorageListener(themeManager);

		globalThis.localStorage.setItem("theme", "dark");

		expect(setThemeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("handles invalid themes in storage events", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const cleanup = registerStorageListener(themeManager);

		globalThis.localStorage.setItem("theme", "missing");

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"Invalid theme found in local storage: Theme 'missing' not found.\nAuto-fixing...",
		);

		cleanup();
	});

	it("ignores storage events for system theme if system theme is already active", () => {
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

		const beforeChangeSpy = vi.fn();
		themeManager.on("beforeChange", beforeChangeSpy);

		expect(themeManager.resolvedUseSystemTheme).toBe(true);

		const cleanup = registerStorageListener(themeManager);

		globalThis.localStorage.setItem("theme", "system");

		expect(beforeChangeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("ignores storage events for the currently selected theme", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const beforeChangeSpy = vi.fn();
		themeManager.on("beforeChange", beforeChangeSpy);

		const cleanup = registerStorageListener(themeManager);

		globalThis.localStorage.setItem("theme", "light");

		expect(beforeChangeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("sets theme when a valid theme change occurs in localStorage, and cleanup prevents subsequent triggers", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const beforeChangeSpy = vi.fn();
		themeManager.on("beforeChange", beforeChangeSpy);

		const cleanup = registerStorageListener(themeManager);

		globalThis.localStorage.setItem("theme", "dark");

		expect(beforeChangeSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "dark",
			}),
		);

		cleanup();

		globalThis.localStorage.setItem("theme", "dark");

		expect(beforeChangeSpy).not.toHaveBeenCalledTimes(2);
	});

	it("sets theme when a valid theme change occurs in sessionStorage, and cleanup prevents subsequent triggers", async () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig({
					storage: {
						methods: ["sessionStorage"],
						key: "theme",
						cookie: { name: "theme" },
					},
				}),
			),
		);

		const beforeChangeSpy = vi.fn();
		themeManager.on("beforeChange", beforeChangeSpy);

		const cleanup = registerStorageListener(themeManager);

		globalThis.sessionStorage.setItem("theme", "dark");

		await vi.waitFor(() =>
			expect(beforeChangeSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					to: "dark",
				}),
			),
		);

		cleanup();

		globalThis.sessionStorage.setItem("theme", "dark");

		expect(beforeChangeSpy).not.toHaveBeenCalledTimes(2);
	});
});

describe("registerThemeManager", () => {
	it("sets up storage and media listeners, and applies persisted theme when present", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const beforeChangeSpy = vi.fn();
		themeManager.on("beforeChange", beforeChangeSpy);

		const getPersistedThemeSpy = vi.spyOn(persistenceModule, "getPersistedTheme").mockResolvedValue("dark");

		const cleanup = $effect.root(() => {
			registerThemeManager(themeManager);
		});

		flushSync();

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(beforeChangeSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "dark",
			}),
		);

		expect(getPersistedThemeSpy).toHaveBeenCalledWith(themeManager);

		cleanup();
	});

	it("does not call setTheme if there is no persisted theme", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const getPersistedThemeSpy = vi.spyOn(persistenceModule, "getPersistedTheme").mockResolvedValue(undefined);
		const setThemeSpy = vi.spyOn(themeManager, "setTheme");

		const cleanup = $effect.root(() => {
			registerThemeManager(themeManager);
		});

		flushSync();

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(getPersistedThemeSpy).toHaveBeenCalledWith(themeManager);
		expect(setThemeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("calls setForcedTheme when dominant forced theme differs from manager forced theme", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const setForcedThemeSpy = vi.spyOn(themeManager, "setForcedTheme").mockResolvedValue(ok());

		vi.spyOn(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry, "dominantForcedTheme", "get").mockReturnValue(
			"dark",
		);

		const cleanup = $effect.root(() => {
			registerThemeManager(themeManager);
		});

		flushSync();

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(setForcedThemeSpy).toHaveBeenCalledWith("dark");

		cleanup();
	});

	it("logs an error when setForcedTheme returns an error", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry, "dominantForcedTheme", "get").mockReturnValue(
			"missing",
		);

		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const cleanup = $effect.root(() => {
			registerThemeManager(themeManager);
		});

		flushSync();

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(consoleSpy).toHaveBeenCalledWith(ThemeManagerError.themeNotFound("missing").message);

		cleanup();
	});

	it("does not call setForcedTheme when forced theme matches dominant forced theme", async () => {
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ forcedTheme: "light" }, false)));

		vi.spyOn(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry, "dominantForcedTheme", "get").mockReturnValue(
			"light",
		);

		const setForcedThemeSpy = vi.spyOn(themeManager, "setForcedTheme");

		const cleanup = $effect.root(() => {
			registerThemeManager(themeManager);
		});

		flushSync();

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(setForcedThemeSpy).not.toHaveBeenCalled();

		cleanup();
	});

	it("accesses reactive properties resolvedTheme and resolvedUseSystemTheme, then updates the DOM", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const cleanup = $effect.root(() => {
			registerThemeManager(themeManager);
		});

		flushSync();

		expect(document.documentElement.classList).toContain(MOCK_THEME_MANAGER_CONFIG.themes.light.className ?? "light");

		cleanup();
	});
});
