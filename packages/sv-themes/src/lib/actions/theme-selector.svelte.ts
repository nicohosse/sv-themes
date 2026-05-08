import type { ActionReturn } from "svelte/action";
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

	let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
	let activeHoverId: string | undefined;

	let resolvedThemeId =
		themeId === "system" && themeManager.systemTheme
			? themeManager.resolvedSystemThemes[themeManager.systemTheme]
			: themeId;

	let resolvedTheme = resolvedThemeId !== "system" ? themeManager.themes[resolvedThemeId] : undefined;

	const clearHover = () => {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = undefined;
		}

		activeHoverId = undefined;
	};

	const onClick = () => {
		themeManager.setTheme(themeId);
	};

	const onPointerEnter = () => {
		if (!preloading.usePreloading || themeManager.resolvedTheme === resolvedThemeId || !resolvedTheme) return;

		activeHoverId = resolvedThemeId as string;

		if (hoverTimeout) clearTimeout(hoverTimeout);

		hoverTimeout = setTimeout(() => {
			if (activeHoverId !== resolvedThemeId || !resolvedTheme) return;

			preloadTheme(resolvedTheme);
			hoverTimeout = undefined;
		}, preloading.hoverDebounceDelay);
	};

	const onPointerLeave = () => {
		if (!preloading.usePreloading || themeManager.resolvedTheme === resolvedThemeId || !resolvedTheme) return;

		if (activeHoverId === resolvedThemeId) {
			clearHover();
			unloadTheme(resolvedTheme);
		}
	};

	node.addEventListener("click", onClick);
	node.addEventListener("pointerenter", onPointerEnter);
	node.addEventListener("pointerleave", onPointerLeave);

	$effect(() => {
		node.ariaPressed = (
			(themeId === "system" && themeManager.useSystemTheme) ||
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

			resolvedTheme = resolvedThemeId !== "system" ? themeManager.themes[resolvedThemeId] : undefined;

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
