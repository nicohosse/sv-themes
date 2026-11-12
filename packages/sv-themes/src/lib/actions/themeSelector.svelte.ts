import type { ActionReturn } from "svelte/action";
import { getThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
import { logError } from "#lib/core/logger.js";
import type { ThemeRecord } from "#lib/core/theme/theme.js";
import type { ThemeManagerError } from "#lib/core/themeManager/errors.js";
import type { ThemeManager } from "#lib/core/themeManager/themeManager.js";

type ThemeSelectorParams<Themes extends ThemeRecord> = {
	themeManager?: ThemeManager<Themes>;
	theme: keyof Themes | "system";
	onError?: (error: ThemeManagerError) => void;
};

/**
 * A Svelte action applied to HTML button elements to handle theme switching on click.
 * Automatically synchronizes the button's `aria-pressed` accessibility attribute
 * based on whether the button's target theme matches the active theme preference.
 *
 * @param node - The HTML button element the action is applied to.
 * @param params - Configuration parameters containing an optional theme manager, the target theme ID, and error callback.
 * @returns The Svelte Action lifecycle methods (`update`, `destroy`) for cleanup.
 */
export function themeSelector<Themes extends ThemeRecord>(
	node: HTMLButtonElement,
	params: ThemeSelectorParams<Themes>,
): ActionReturn<ThemeSelectorParams<Themes>> {
	let themeId = $state<keyof Themes | "system">(params.theme);
	let themeManager = $state.raw<ThemeManager<Themes>>(params.themeManager ?? getThemeManager<Themes>());
	let onError = $state.raw(params.onError);

	const onClick = async () => {
		const result = await themeManager.setTheme(themeId.toString() as keyof Themes | "system");

		if (result.isOk()) return;

		logError(`Failed to select theme: ${result.error.message}`, themeManager);

		onError?.(result.error);
	};

	node.addEventListener("click", onClick);

	$effect(() => {
		const isPressed =
			themeId === "system"
				? themeManager.useSystemTheme
				: !themeManager.useSystemTheme && themeManager.selectedTheme === themeId;

		node.ariaPressed = isPressed.toString();
	});

	return {
		update(newParams) {
			themeId = newParams.theme;
			onError = newParams.onError;
			themeManager = newParams.themeManager ?? getThemeManager();
		},

		destroy() {
			node.removeEventListener("click", onClick);
		},
	};
}
