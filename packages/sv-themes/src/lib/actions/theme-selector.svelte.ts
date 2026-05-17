import type { ActionReturn } from "svelte/action";
import type { ThemeManager, ThemeRecord } from "$lib/index.js";

type ThemeSelectorParams<Themes extends ThemeRecord> = {
	theme: keyof Themes | "system";
	themeManager: ThemeManager<Themes>;
};

export function themeSelector<Themes extends ThemeRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<Themes>,
): ActionReturn<ThemeSelectorParams<Themes>> {
	let { theme: themeId, themeManager } = params;

	const getResolvedThemeId = () => {
		return themeId === "system" && themeManager.systemThemes.kind === "enabled" && themeManager.systemThemes.systemTheme
			? themeManager.systemThemes.mappings[themeManager.systemThemes.systemTheme]
			: themeId;
	};

	let resolvedThemeId = getResolvedThemeId();

	const onClick = async () => {
		const result = await themeManager.setTheme(themeId);
		if (result.isErr()) console.error(result.error.message);
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

			resolvedThemeId = getResolvedThemeId();
		},

		destroy() {
			node.removeEventListener("click", onClick);
		},
	};
}
