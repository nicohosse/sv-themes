import type { Cookies } from "@sveltejs/kit";
import { BROWSER } from "esm-env";
import { getCookie, getCookieSync, setCookie } from "#lib/utils/cookie.js";
import { logError } from "../logger.js";
import type { ThemeRecord } from "../theme/theme.js";
import { STORAGE_METHOD_PRIORITY, type StorageMethod, type ThemeManager } from "./themeManager.js";

export interface GetPersistedThemeConfig {
	serverSideOnly?: boolean;
	syncOnMiss?: boolean;
	fixErrors?: boolean;
	errorOnMiss?: boolean;
	cookies?: Cookies;
}

function getSortedStorageMethods<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
): StorageMethod[] {
	return (
		themeManager.storage?.methods.toSorted((a, b) => STORAGE_METHOD_PRIORITY[b] - STORAGE_METHOD_PRIORITY[a]) ?? []
	);
}

function isKnownPersistedTheme<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	theme: string,
): boolean {
	return theme === "system" || themeManager.themeIds.includes(theme as keyof Themes);
}

function readWebStorage<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	storageMethod: "localStorage" | "sessionStorage",
): string | null | undefined {
	try {
		return globalThis[storageMethod].getItem(themeManager.storage?.key ?? "theme");
	} catch (error) {
		logError(
			`Failed to read theme from ${storageMethod}: ${error instanceof Error ? error.message : String(error)}`,
			themeManager,
		);

		return undefined;
	}
}

function writeWebStorage<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	storageMethod: "localStorage" | "sessionStorage",
	theme: string,
) {
	try {
		globalThis[storageMethod].setItem(themeManager.storage?.key ?? "theme", theme);
	} catch (error) {
		logError(
			`Failed to save theme to ${storageMethod}: ${error instanceof Error ? error.message : String(error)}`,
			themeManager,
		);
	}
}

export async function getPersistedTheme<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	config?: GetPersistedThemeConfig,
): Promise<string | undefined> {
	if (!themeManager.storage) return;
	const persistedThemes: Map<StorageMethod, string> = new Map();

	const sortedStorageMethods = getSortedStorageMethods(themeManager);

	// Methods are sorted by descending priority. The first readable value wins, so a
	// cookie (priority 2) is always preferred over localStorage (1) and sessionStorage (0).
	let dominantTheme: string | undefined;

	for (const storageMethod of sortedStorageMethods) {
		const isLocalStorage = storageMethod === "localStorage";
		const isSessionStorage = storageMethod === "sessionStorage";
		const isCookie = storageMethod === "cookie";

		if (BROWSER && isLocalStorage && !config?.serverSideOnly) {
			const storedTheme = readWebStorage(themeManager, "localStorage");

			if (!storedTheme) {
				if (config?.errorOnMiss)
					logError(
						`Failed to get theme from local storage. ${config?.syncOnMiss ? "Marking as desynced" : "Skipping"}.`,
						themeManager,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme ??= storedTheme;
		} else if (!BROWSER && isLocalStorage && !config?.serverSideOnly)
			logError("Tried to get theme from local storage from a non-browser context. Skipping.", themeManager);
		else if (BROWSER && isSessionStorage && !config?.serverSideOnly) {
			const storedTheme = readWebStorage(themeManager, "sessionStorage");

			if (!storedTheme) {
				if (config?.errorOnMiss)
					logError(
						`Failed to get theme from session storage. ${config?.syncOnMiss ? "Marking as desynced" : "Skipping"}.`,
						themeManager,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme ??= storedTheme;
		} else if (!BROWSER && isSessionStorage && !config?.serverSideOnly)
			logError("Tried to get theme from session storage from a non-browser context. Skipping.", themeManager);
		else if (isCookie) {
			const storedTheme = await getCookie(themeManager.storage.cookie.name, config?.cookies);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					logError(
						`Failed to get theme from cookie. ${config?.syncOnMiss ? "Marking as desynced" : "Skipping"}.`,
						themeManager,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme ??= storedTheme;
		}
	}

	if (dominantTheme && !isKnownPersistedTheme(themeManager, dominantTheme)) {
		if (!config?.fixErrors) return undefined;

		await persistTheme(themeManager, themeManager.selectedTheme, config?.cookies);

		return themeManager.selectedTheme as string;
	}

	if (config?.syncOnMiss && dominantTheme) {
		const activeMethods: StorageMethod[] = config?.serverSideOnly ? ["cookie"] : themeManager.storage.methods;
		const missingAny = activeMethods.some((storageMethod) => !persistedThemes.has(storageMethod));

		if (missingAny) await persistTheme(themeManager, dominantTheme, config?.cookies);
	}

	return dominantTheme;
}

/**
 * Synchronous browser-only persistence read used during initialization.
 *
 * The head bootloader already applies the persisted theme before hydration. Reading the
 * same value synchronously keeps the reactive manager state aligned with the DOM and
 * avoids both a flash of the wrong theme and a late async write overwriting a new choice.
 */
export function getPersistedThemeSync<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
): string | undefined {
	if (!BROWSER || !themeManager.storage) return;

	const sortedStorageMethods = getSortedStorageMethods(themeManager);

	let dominantTheme: string | undefined;

	for (const storageMethod of sortedStorageMethods) {
		let storedTheme: string | null | undefined;

		if (storageMethod === "localStorage") storedTheme = readWebStorage(themeManager, "localStorage");
		else if (storageMethod === "sessionStorage") storedTheme = readWebStorage(themeManager, "sessionStorage");
		else if (storageMethod === "cookie") storedTheme = getCookieSync(themeManager.storage.cookie.name);

		if (!storedTheme) continue;

		dominantTheme ??= storedTheme;
	}

	if (!dominantTheme) return;

	if (!isKnownPersistedTheme(themeManager, dominantTheme)) return;

	return dominantTheme;
}

export async function persistTheme<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	theme: keyof Themes | "system",
	cookies?: Cookies,
) {
	if (!themeManager.storage) return;

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");
	const useCookie = themeManager.storage.methods?.includes("cookie");

	const themeId = theme.toString();

	if (BROWSER && useLocalStorage) writeWebStorage(themeManager, "localStorage", themeId);
	else if (!BROWSER && useLocalStorage)
		logError(`Tried to save theme '${themeId}' to local storage in a non-browser context. Skipping.`, themeManager);

	if (BROWSER && useSessionStorage) writeWebStorage(themeManager, "sessionStorage", themeId);
	else if (!BROWSER && useSessionStorage)
		logError(`Tried to save theme '${themeId}' to session storage in a non-browser context. Skipping.`, themeManager);

	if (!useCookie) return;

	// Server-side rendering must never reach `document.cookie`. Without a SvelteKit
	// cookie store there is nowhere safe to persist the value.
	if (!BROWSER && !cookies) {
		logError(
			`Tried to save theme '${themeId}' to a cookie in a non-browser context without a cookie store. Skipping.`,
			themeManager,
		);

		return;
	}

	await setCookie(themeId, themeManager.storage.cookie, cookies);
}
