import type { Cookies } from "@sveltejs/kit";
import { describe, expect, it, vi } from "vitest";
import { createMockCookies } from "$lib/tests/cookie.js";
import { expectOk } from "$lib/tests/setup.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { getCookie, setCookie } from "$lib/utils/cookie.js";
import { createThemeManager } from "./create-theme-manager.svelte.js";
import { getPersistedTheme, persistTheme } from "./persistence.js";

describe("getPersistedTheme", () => {
	it("returns undefined when storage is not defined on themeManager", async () => {
		const themeManager = expectOk(
			createThemeManager(createMockThemeManagerConfig({ enableTabSync: false, storage: undefined })),
		);

		const result = await getPersistedTheme(themeManager);

		expect(result).toBeUndefined();
	});

	describe("localStorage", () => {
		it("reads from localStorage when in browser context and localStorage is enabled", async () => {
			globalThis.localStorage.setItem("theme", "dark");

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager);

			expect(result).toBe("dark");
		});

		it("logs error and continues when localStorage miss and errorOnMiss is enabled with syncOnMiss", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: true, syncOnMiss: true });

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith("Failed to get theme from local storage. Marking as desynced.");
		});

		it("logs error and continues when localStorage miss and errorOnMiss is enabled without syncOnMiss", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: true, syncOnMiss: false });

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith("Failed to get theme from local storage. Skipping.");
		});

		it("does not log error when localStorage miss and errorOnMiss is false", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: false });

			expect(result).toBeUndefined();
			expect(spyConsoleError).not.toHaveBeenCalled();
		});

		it("skips localStorage and logs error when in non-browser context and localStorage is enabled", async () => {
			testEnv().browser(false).apply();

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager);

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith(
				"Tried to get theme from local storage from a non-browser context. Skipping.",
			);
		});
	});

	describe("sessionStorage", () => {
		it("reads from sessionStorage when in browser context and sessionStorage is enabled", async () => {
			globalThis.sessionStorage.setItem("theme", "light");

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
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

			const result = await getPersistedTheme(themeManager);
			expect(result).toBe("light");
		});

		it("logs error and continues when sessionStorage miss and errorOnMiss is enabled with syncOnMiss", async () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
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

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: true, syncOnMiss: true });

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith("Failed to get theme from session storage. Marking as desynced.");
		});

		it("logs error and continues when sessionStorage miss and errorOnMiss is enabled without syncOnMiss", async () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
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

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: true, syncOnMiss: false });

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith("Failed to get theme from session storage. Skipping.");
		});

		it("does not log error when sessionStorage miss and errorOnMiss is false", async () => {
			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
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

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: false });

			expect(result).toBeUndefined();
			expect(spyConsoleError).not.toHaveBeenCalled();
		});

		it("skips sessionStorage and logs error when in non-browser context and sessionStorage is enabled", async () => {
			testEnv().browser(false).apply();

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
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

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager);

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith(
				"Tried to get theme from session storage from a non-browser context. Skipping.",
			);
		});
	});

	describe("cookie", () => {
		it("reads from cookie when cookie storage is enabled", async () => {
			await setCookie("dark", { name: "theme" });

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager);

			expect(result).toBe("dark");
		});

		it("logs error and continues when cookie miss and errorOnMiss is enabled with syncOnMiss", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: true, syncOnMiss: true });

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith("Failed to get theme from cookie. Marking as desynced.");
		});

		it("logs error and continues when cookie miss and errorOnMiss is enabled without syncOnMiss", async () => {
			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await getPersistedTheme(themeManager, { errorOnMiss: true, syncOnMiss: false });

			expect(result).toBeUndefined();
			expect(spyConsoleError).toHaveBeenCalledWith("Failed to get theme from cookie. Skipping.");
		});
	});

	describe("validation and syncing", () => {
		it("returns selected theme and fixes error by persisting selected theme if dominant theme is invalid and fixErrors is true", async () => {
			globalThis.localStorage.setItem("theme", "missing");

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager, { fixErrors: true });

			expect(result).toBe("light");
			expect(globalThis.localStorage.getItem("theme")).toBe("light");
		});

		it("returns undefined and does not persist selected theme if dominant theme is invalid and fixErrors is false", async () => {
			globalThis.localStorage.setItem("theme", "missing");

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager, { fixErrors: false });

			expect(result).toBeUndefined();
			expect(globalThis.localStorage.getItem("theme")).toBe("missing");
		});

		it("returns system if dominant theme is system even if system is not in themeIds", async () => {
			globalThis.localStorage.setItem("theme", "system");

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager);
			expect(result).toBe("system");
		});

		it("syncs missing storage methods when syncOnMiss is true and serverSideOnly is false", async () => {
			globalThis.localStorage.setItem("theme", "dark");

			const themeManager = expectOk(
				createThemeManager(
					createMockThemeManagerConfig(
						{
							storage: {
								methods: ["localStorage", "sessionStorage", "cookie"],
								key: "theme",
								cookie: { name: "theme" },
							},
						},
						false,
					),
				),
			);

			const result = await getPersistedTheme(themeManager, { syncOnMiss: true });

			expect(result).toBe("dark");
			expect(globalThis.sessionStorage.getItem("theme")).toBe("dark");
			expect(await getCookie("theme")).toBe("dark");
		});

		it("does not sync when serverSideOnly is true and cookie is found", async () => {
			testEnv().browser(false).apply();

			const cookies = createMockCookies();

			await setCookie("dark", { name: "theme" }, cookies as unknown as Cookies);

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager, {
				syncOnMiss: true,
				serverSideOnly: true,
				cookies: cookies as unknown as Cookies,
			});

			expect(result).toBe("dark");
			expect(globalThis.localStorage.getItem("theme")).toBeNull();
		});

		it("returns dominant theme without syncing when no storage methods are missing", async () => {
			globalThis.localStorage.setItem("theme", "dark");

			await setCookie("dark", { name: "theme" });

			const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

			const result = await getPersistedTheme(themeManager, { syncOnMiss: true });

			expect(result).toBe("dark");
			expect(globalThis.localStorage.getItem("theme")).toBe("dark");
			expect(await getCookie("theme")).toBe("dark");
		});
	});
});

describe("persistTheme", () => {
	it("returns undefined when storage is not defined on themeManager", async () => {
		const themeManager = expectOk(
			createThemeManager(createMockThemeManagerConfig({ enableTabSync: false, storage: undefined }, false)),
		);

		await persistTheme(themeManager, "dark");

		expect(globalThis.localStorage.getItem("theme")).toBeNull();
		expect(globalThis.sessionStorage.getItem("theme")).toBeNull();
		expect(await getCookie("theme")).toBeUndefined();
	});

	it("saves theme to localStorage when in browser context and localStorage is enabled", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		await persistTheme(themeManager, "dark");

		expect(globalThis.localStorage.getItem("theme")).toBe("dark");
	});

	it("logs error and skips saving to localStorage in non-browser context if localStorage is enabled", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		await persistTheme(themeManager, "dark");

		expect(spyConsoleError).toHaveBeenCalledWith(
			"Tried to save theme 'dark' to local storage in a non-browser context. Skipping.",
		);
	});

	it("saves theme to sessionStorage when in browser context and sessionStorage is enabled", async () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
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

		await persistTheme(themeManager, "light");

		expect(globalThis.sessionStorage.getItem("theme")).toBe("light");
	});

	it("logs error and skips saving to sessionStorage in non-browser context if sessionStorage is enabled", async () => {
		testEnv().browser(false).apply();

		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
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

		const spyConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

		await persistTheme(themeManager, "light");

		expect(spyConsoleError).toHaveBeenCalledWith(
			"Tried to save theme 'light' to session storage in a non-browser context. Skipping.",
		);
	});

	it("saves theme to cookie when cookie storage is enabled", async () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		await persistTheme(themeManager, "dark");

		expect(await getCookie("theme")).toBe("dark");
	});

	it("does not save to localStorage, sessionStorage, or cookie if those methods are not enabled", async () => {
		const themeManager = expectOk(
			createThemeManager(
				createMockThemeManagerConfig(
					{
						enableTabSync: false,
						storage: {
							methods: [],
							key: "theme",
							cookie: { name: "theme" },
						},
					},
					false,
				),
			),
		);

		await persistTheme(themeManager, "dark");

		expect(globalThis.localStorage.getItem("theme")).toBeNull();
		expect(globalThis.sessionStorage.getItem("theme")).toBeNull();
		expect(await getCookie("theme")).toBeUndefined();
	});
});
