import type { ActionReturn } from "svelte/action";
import { preloadTheme, type ThemesRecord, unloadTheme } from "./theme.ts";
import type { ThemeManager } from "./theme-manager.svelte.ts";

type ThemeSelectorParams<Themes extends ThemesRecord> = {
	theme: keyof Themes | "system";
	themeManager: ThemeManager<Themes>;
};

export function themeSelector<T extends ThemesRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<T>,
): ActionReturn<ThemeSelectorParams<T>> {
	let { theme: themeId, themeManager } = params;

	const resolvedThemeId =
		themeId === "system" && themeManager.systemTheme
			? themeManager.resolvedSystemThemes[themeManager.systemTheme]
			: themeId;

	const resolvedTheme = resolvedThemeId !== "system" && themeManager.themes[resolvedThemeId];

	const onClick = () => {
		themeManager.setTheme(themeId);
	};

	const onPointerEnter = () => {
		if (themeManager.resolvedTheme === resolvedThemeId || !resolvedTheme) return;
		preloadTheme(resolvedTheme);
	};

	const onPointerLeave = () => {
		if (themeManager.resolvedTheme === resolvedThemeId || !resolvedTheme) return;
		unloadTheme(resolvedTheme);
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
		},
		destroy() {
			node.removeEventListener("click", onClick);
			node.removeEventListener("pointerenter", onPointerEnter);
			node.removeEventListener("pointerleave", onPointerLeave);
		},
	};
}
