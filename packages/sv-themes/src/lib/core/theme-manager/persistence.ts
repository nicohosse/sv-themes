import type { Cookies } from "@sveltejs/kit";
import { BROWSER } from "esm-env";
import type { ThemeRecord } from "$lib/index.js";
import { getCookie, setCookie } from "$lib/utils/cookie.js";
import { STORAGE_METHOD_PRIORITY, type StorageMethod, type ThemeManager } from "./theme-manager.js";

export async function getPersistedTheme<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	config?: {
		serverSideOnly?: boolean;
		syncOnMiss?: boolean;
		fixErrors?: boolean;
		errorOnMiss?: boolean;
		cookies?: Cookies;
	},
) {
	if (!themeManager.storage) return;
	const persistedThemes: Map<StorageMethod, string> = new Map();

	const sortedStorageMethods = themeManager.storage.methods.toSorted(
		(a, b) => STORAGE_METHOD_PRIORITY[b] - STORAGE_METHOD_PRIORITY[a],
	);

	let dominantTheme: string | undefined;

	for (const storageMethod of sortedStorageMethods) {
		const isLocalStorage = storageMethod === "localStorage";
		const isSessionStorage = storageMethod === "sessionStorage";
		const isCookie = storageMethod === "cookie";

		if (BROWSER && isLocalStorage && !config?.serverSideOnly) {
			const storedTheme = globalThis.localStorage.getItem(themeManager.storage.key);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from local storage. ${config?.syncOnMiss ? "Marking as desynced" : "Skipping"}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme = storedTheme ?? dominantTheme;
		} else if (!BROWSER && isLocalStorage && !config?.serverSideOnly)
			console.error(`Tried to get theme from local storage from a non-browser context. Skipping.`);
		else if (BROWSER && isSessionStorage && !config?.serverSideOnly) {
			const storedTheme = globalThis.sessionStorage.getItem(themeManager.storage.key);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(
						`Failed to get theme from session storage. ${config?.syncOnMiss ? "Marking as desynced" : "Skipping"}.`,
					);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme = storedTheme ?? dominantTheme;
		} else if (!BROWSER && isSessionStorage && !config?.serverSideOnly)
			console.error(`Tried to get theme from session storage from a non-browser context. Skipping.`);
		else if (isCookie) {
			const storedTheme = await getCookie(themeManager.storage.cookie.name, config?.cookies);

			if (!storedTheme) {
				if (config?.errorOnMiss)
					console.error(`Failed to get theme from cookie. ${config?.syncOnMiss ? "Marking as desynced" : "Skipping"}.`);

				continue;
			}

			persistedThemes.set(storageMethod, storedTheme);
			dominantTheme = storedTheme ?? dominantTheme;
		}
	}

	if (dominantTheme && dominantTheme !== "system" && !themeManager.themeIds.includes(dominantTheme)) {
		if (!config?.fixErrors) return undefined;

		await persistTheme(themeManager, themeManager.selectedTheme, config?.cookies);

		return themeManager.selectedTheme;
	}

	if (config?.syncOnMiss && dominantTheme) {
		const activeMethods: StorageMethod[] = config?.serverSideOnly ? ["cookie"] : themeManager.storage.methods;
		const missingAny = activeMethods.some((storageMethod) => !persistedThemes.has(storageMethod));

		if (missingAny) await persistTheme(themeManager, dominantTheme, config?.cookies);
	}

	return dominantTheme;
}

export async function persistTheme<const Themes extends ThemeRecord>(
	themeManager: ThemeManager<Themes>,
	theme: keyof Themes,
	cookies?: Cookies,
) {
	if (!themeManager.storage) return;

	const useLocalStorage = themeManager.storage.methods?.includes("localStorage");
	const useSessionStorage = themeManager.storage.methods?.includes("sessionStorage");
	const useCookie = themeManager.storage.methods?.includes("cookie");

	const themeId = theme.toString();

	if (BROWSER && useLocalStorage) globalThis.localStorage.setItem(themeManager.storage.key, themeId);
	else if (!BROWSER && useLocalStorage)
		console.error(`Tried to save theme '${themeId}' to local storage in a non-browser context. Skipping.`);

	if (BROWSER && useSessionStorage) globalThis.sessionStorage.setItem(themeManager.storage.key, themeId);
	else if (!BROWSER && useSessionStorage)
		console.error(`Tried to save theme '${themeId}' to session storage in a non-browser context. Skipping.`);

	if (useCookie) await setCookie(themeId, themeManager.storage.cookie, cookies);
}
