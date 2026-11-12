<script lang="ts" generics="const Themes extends ThemeRecord">
	import { BROWSER } from "esm-env";
	import type { Snippet } from "svelte";
	import { getForceThemeParentId, setForceThemeParentId } from "$lib/contexts/force-theme-parent-id-context.svelte.js";
	import { getThemeManager } from "$lib/contexts/theme-manager-context.svelte.js";
	import { INTERNAL as THEME_MANAGER_INTERNAL } from "$lib/core/theme-manager/theme-manager.js";
	import type { ThemeRecord } from "$lib/index.js";

	interface ForceThemeProps<Themes extends ThemeRecord> {
		forcedTheme?: keyof Themes | "system";
		priority?: number;
		overrideChildren?: boolean;
		children?: Snippet;
	}

	let { forcedTheme, priority = 0, overrideChildren = false, children }: ForceThemeProps<Themes> = $props();

	const id = Symbol("force-theme");
	const parentId = getForceThemeParentId();

	setForceThemeParentId(id);

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
			content={`forcedTheme=${forcedTheme?.toString()};priority=${priority};overrideChildren=${overrideChildren}`}
		/>
	{/if}
</svelte:head>

{@render children?.()}
