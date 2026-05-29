import type { ActionReturn } from "svelte/action";
import { getThemeManager } from "$lib/contexts/theme-manager-context.svelte.js";
import { logError } from "$lib/core/index.js";
import type { ThemeRecord } from "$lib/index.js";

type ThemeSelectorParams<Themes extends ThemeRecord> = {
	theme: keyof Themes | "system";
};

/**
 * A Svelte action applied to HTML button elements to handle theme switching on click.
 * Automatically synchronizes the button's `aria-pressed` accessibility attribute
 * based on whether the button's target theme matches the active theme state.
 *
 * @param node - The HTML button element the action is applied to.
 * @param params - Configuration parameters containing the target theme ID.
 * @returns The Svelte Action lifecycle methods (`update`, `destroy`) for cleanup.
 */
export function themeSelector<Themes extends ThemeRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<Themes>,
): ActionReturn<ThemeSelectorParams<Themes>> {
	let { theme: themeId } = params;

	let themeManager = getThemeManager();

	const getResolvedThemeId = () => {
		return themeId === "system" && themeManager.systemThemes.kind === "enabled" && themeManager.systemThemes.systemTheme
			? themeManager.systemThemes.mappings[themeManager.systemThemes.systemTheme]
			: themeId;
	};

	let resolvedThemeId = getResolvedThemeId();

	const onClick = async () => {
		const result = await themeManager.setTheme(themeId.toString());
		if (result.isErr()) logError(result.error.message, themeManager);
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

			themeManager = getThemeManager();

			resolvedThemeId = getResolvedThemeId();
		},

		destroy() {
			node.removeEventListener("click", onClick);
		},
	};
}
