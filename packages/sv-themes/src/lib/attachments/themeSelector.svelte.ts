import type { Attachment } from "svelte/attachments";
import { getThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
import { logError } from "#lib/core/logger.js";
import type { ThemeRecord } from "#lib/core/theme/theme.js";
import type { ThemeManagerError } from "#lib/core/themeManager/errors.js";
import type { ThemeManager } from "#lib/core/themeManager/themeManager.js";

export type ThemeSelectorParams<Themes extends ThemeRecord> = {
	themeManager?: ThemeManager<Themes>;
	theme: keyof Themes | "system";
	onError?: (error: ThemeManagerError) => void;
};

/**
 * A Svelte attachment applied to HTML button elements to handle theme switching on click.
 * Automatically synchronizes the button's `aria-pressed` accessibility attribute
 * based on whether the button's target theme matches the active theme preference.
 *
 * Attachments re-run when reactive parameters change, so `{@attach themeSelector({ theme })}`
 * follows updates to `theme` without an explicit `update` method.
 *
 * @param params - Configuration parameters containing an optional theme manager, the target theme ID, and error callback.
 * @returns The Svelte attachment callback that wires up the element and returns its cleanup function.
 */
export function themeSelector<Themes extends ThemeRecord>(
	params: ThemeSelectorParams<Themes>,
): Attachment<HTMLButtonElement> {
	const themeManager = params.themeManager ?? getThemeManager<Themes>();

	return (node) => {
		const onClick = async () => {
			const result = await themeManager.setTheme(params.theme.toString() as keyof Themes | "system");

			if (result.isOk()) return;

			logError(`Failed to select theme: ${result.error.message}`, themeManager);

			params.onError?.(result.error);
		};

		node.addEventListener("click", onClick);

		$effect(() => {
			const themeId = params.theme;

			const isPressed =
				themeId === "system"
					? themeManager.useSystemTheme
					: !themeManager.useSystemTheme && themeManager.selectedTheme === themeId;

			node.ariaPressed = isPressed.toString();
		});

		return () => {
			node.removeEventListener("click", onClick);
		};
	};
}
