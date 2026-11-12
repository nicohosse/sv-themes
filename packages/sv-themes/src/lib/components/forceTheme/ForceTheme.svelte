<script lang="ts" generics="const Themes extends ThemeRecord">
	import { BROWSER } from "esm-env";
	import type { Snippet } from "svelte";
	import { getForceThemeContext, setForceThemeContext } from "#lib/contexts/forceThemeParentIdContext.svelte.js";
	import { getThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
	import type { ThemeRecord } from "#lib/core/theme/theme.js";
	import { INTERNAL as THEME_MANAGER_INTERNAL } from "#lib/core/themeManager/themeManager.js";

	interface ForceThemeProps<Themes extends ThemeRecord> {
		forcedTheme?: keyof Themes | "system";
		priority?: number;
		overrideChildren?: boolean;
		children?: Snippet;
	}

	let { forcedTheme, priority = 0, overrideChildren = false, children }: ForceThemeProps<Themes> = $props();

	const id = Symbol("force-theme");
	const parent = getForceThemeContext();
	const parentId = parent?.id;
	const depth = (parent?.depth ?? -1) + 1;

	setForceThemeContext({ id, depth });

	let themeManager = getThemeManager();

	$effect.pre(() => {
		themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.register({
			id: id,
			parentId,
			forcedTheme: forcedTheme?.toString(),
			priority,
			overrideChildren,
		});

		return () => themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.unregister(id);
	});
</script>

<svelte:head>
	{#if !BROWSER}
		<meta
			name="sv-themes-force-theme"
			content={encodeURIComponent(
				JSON.stringify({
					forcedTheme: forcedTheme?.toString() ?? null,
					priority,
					overrideChildren,
					depth,
				}),
			)}
		/>
	{/if}
</svelte:head>

{@render children?.()}
