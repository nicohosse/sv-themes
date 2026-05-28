import { describe, expect, it, vi } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import { createMockThemeManagerConfig, MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import { logError, logInfo } from "./logger.js";
import { createThemeManager } from "./theme-manager/create-theme-manager.svelte.js";

describe("logInfo", () => {
	it("logs to console.info when logging is enabled in theme manager", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		logInfo("Test", themeManager);

		expect(consoleInfoSpy).toHaveBeenCalledOnce();
	});

	it("logs to console.info when theme manager is undefined", () => {
		const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		logInfo("Test");

		expect(consoleInfoSpy).toHaveBeenCalledOnce();
	});

	it("doesnt do anything when logging is disabled in theme manager", () => {
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ enableLogging: false }, false)));

		const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		logInfo("Test", themeManager);

		expect(consoleInfoSpy).not.toHaveBeenCalledOnce();
	});
});

describe("logError", () => {
	it("logs to console.error when logging is enabled in theme manager", () => {
		const themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		logError("Test", themeManager);

		expect(consoleErrorSpy).toHaveBeenCalledOnce();
	});

	it("logs to console.error when theme manager is undefined", () => {
		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		logError("Test");

		expect(consoleErrorSpy).toHaveBeenCalledOnce();
	});

	it("doesnt do anything when logging is disabled in theme manager", () => {
		const themeManager = expectOk(createThemeManager(createMockThemeManagerConfig({ enableLogging: false }, false)));

		const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		logError("Test", themeManager);

		expect(consoleErrorSpy).not.toHaveBeenCalledOnce();
	});
});
