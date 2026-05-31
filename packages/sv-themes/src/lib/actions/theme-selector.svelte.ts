import type { ActionReturn } from "svelte/action";
import { getThemeManager } from "$lib/contexts/theme-manager-context.svelte.js";
import { logError } from "$lib/core/index.js";
import type { ThemeManager, ThemeManagerError, ThemeRecord } from "$lib/index.js";

type ThemeSelectorParams<Themes extends ThemeRecord> = {
	themeManager?: ThemeManager<Themes>;
	theme: keyof Themes | "system";
	onError?: (error: ThemeManagerError) => void;
};

/**
 * A Svelte action applied to HTML button elements to handle theme switching on click.
 * Automatically synchronizes the button's `aria-pressed` accessibility attribute
 * based on whether the button's target theme matches the active theme state.
 *
 * @param node - The HTML button element the action is applied to.
 * @param params - Configuration parameters containing an optional theme manager, the target theme ID, and error callback.
 * @returns The Svelte Action lifecycle methods (`update`, `destroy`) for cleanup.
 */
export function themeSelector<Themes extends ThemeRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<Themes>,
): ActionReturn<ThemeSelectorParams<Themes>> {
	let { themeManager: themeManagerProp, theme: themeId, onError } = params;

	let themeManager = themeManagerProp ?? getThemeManager<Themes>();

	const getResolvedThemeId = () => {
		return themeId === "system" && themeManager.systemThemes.kind === "enabled" && themeManager.systemThemes.systemTheme
			? themeManager.systemThemes.mappings[themeManager.systemThemes.systemTheme]
			: themeId;
	};

	let resolvedThemeId = getResolvedThemeId();

	const onClick = async () => {
		const result = await themeManager.setTheme(themeId.toString());

		if (result.isOk()) return;

		logError(`Failed to select theme: ${result.error.message}`, themeManager);

		onError?.(result.error);
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
			onError = newParams.onError;

			themeManagerProp = newParams.themeManager;
			themeManager = themeManagerProp ?? getThemeManager();

			resolvedThemeId = getResolvedThemeId();
		},

		destroy() {
			node.removeEventListener("click", onClick);
		},
	};
}
