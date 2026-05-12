import type { ActionReturn } from "svelte/action";
import { getErrorMessage } from "$lib/core/theme-manager.errors.js";
import { preloadTheme, type ThemesRecord, unloadTheme } from "../core/theme.js";
import type { ThemeManager } from "../core/theme-manager.svelte.js";

interface ThemePreloadingOptions {
	usePreloading?: boolean;
	hoverDebounceDelay?: number;
}

const DEFAULT_THEME_PRELOADING_OPTIONS: ThemePreloadingOptions = {
	usePreloading: true,
	hoverDebounceDelay: 200,
} as const;

type ThemeSelectorParams<Themes extends ThemesRecord> = {
	theme: keyof Themes | "system";
	themeManager: ThemeManager<Themes>;
	preloading?: ThemePreloadingOptions;
};

export function themeSelector<Themes extends ThemesRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<Themes>,
): ActionReturn<ThemeSelectorParams<Themes>> {
	let {
		theme: themeId,
		themeManager,
		preloading = { ...DEFAULT_THEME_PRELOADING_OPTIONS, ...params.preloading },
	} = params;

	let hoverTimeout: NodeJS.Timeout | undefined;
	let activeToken: symbol | undefined;

	let resolvedThemeId =
		themeId === "system" && themeManager.systemTheme
			? themeManager.resolvedSystemThemes[themeManager.systemTheme]
			: themeId;

	let resolvedTheme = themeManager.themes[resolvedThemeId];

	const clearHover = () => {
		activeToken = undefined;

		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = undefined;
		}
	};

	const onClick = async () => {
		const result = await themeManager.setTheme(themeId);
		if (result.isErr()) console.error(getErrorMessage(result.error));
	};

	const onPointerEnter = () => {
		if (!preloading.usePreloading || themeManager.resolvedTheme === resolvedThemeId || themeManager.forcedTheme) return;

		const token = Symbol("hover-token");
		activeToken = token;

		if (hoverTimeout) clearTimeout(hoverTimeout);

		hoverTimeout = setTimeout(async () => {
			if (activeToken !== token) return;

			await preloadTheme(resolvedTheme).catch(() => {});

			if (activeToken !== token) return;

			hoverTimeout = undefined;
		}, preloading.hoverDebounceDelay);
	};

	const onPointerLeave = () => {
		if (!preloading.usePreloading || themeManager.resolvedTheme === resolvedThemeId || themeManager.forcedTheme) return;

		clearHover();

		unloadTheme(resolvedTheme);
	};

	node.addEventListener("click", onClick);
	node.addEventListener("pointerenter", onPointerEnter);
	node.addEventListener("pointerleave", onPointerLeave);

	$effect(() => {
		node.ariaPressed = (
			(themeId === "system" && themeManager.resolvedUseSystemTheme) ||
			themeManager.selectedTheme === resolvedThemeId
		).toString();
	});

	return {
		update(newParams) {
			themeId = newParams.theme;
			themeManager = newParams.themeManager;

			preloading = {
				...DEFAULT_THEME_PRELOADING_OPTIONS,
				...newParams.preloading,
			};

			resolvedThemeId =
				themeId === "system" && themeManager.systemTheme
					? themeManager.resolvedSystemThemes[themeManager.systemTheme]
					: themeId;

			resolvedTheme = themeManager.themes[resolvedThemeId];

			clearHover();
		},

		destroy() {
			clearHover();
			node.removeEventListener("click", onClick);
			node.removeEventListener("pointerenter", onPointerEnter);
			node.removeEventListener("pointerleave", onPointerLeave);
		},
	};
}
