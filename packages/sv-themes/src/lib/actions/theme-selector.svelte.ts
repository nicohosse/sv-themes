import type { ActionReturn } from "svelte/action";
import { getErrorMessage } from "$lib/core/theme-manager.errors.js";
import type { ThemesRecord } from "../core/theme.js";
import type { ThemeManager } from "../core/theme-manager.svelte.js";

type ThemeSelectorParams<Themes extends ThemesRecord> = {
	theme: keyof Themes | "system";
	themeManager: ThemeManager<Themes>;
};

export function themeSelector<Themes extends ThemesRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<Themes>,
): ActionReturn<ThemeSelectorParams<Themes>> {
	let { theme: themeId, themeManager } = params;

	let resolvedThemeId =
		themeId === "system" && themeManager.systemTheme
			? themeManager.resolvedSystemThemes[themeManager.systemTheme]
			: themeId;

	const onClick = async () => {
		const result = await themeManager.setTheme(themeId);
		if (result.isErr()) console.error(getErrorMessage(result.error));
	};

	node.addEventListener("click", onClick);

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

			resolvedThemeId =
				themeId === "system" && themeManager.systemTheme
					? themeManager.resolvedSystemThemes[themeManager.systemTheme]
					: themeId;
		},

		destroy() {
			node.removeEventListener("click", onClick);
		},
	};
}
