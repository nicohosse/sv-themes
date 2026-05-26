<script lang="ts" generics="const Themes extends ThemeRecord">
	import { BROWSER } from "esm-env";
	import type { Snippet } from "svelte";
	import {
		getForceThemeParentId,
		getForceThemeRegistry,
		setForceThemeParentId,
	} from "$lib/contexts/force-theme-requests-context.svelte.js";
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

	let forceThemeRegistry = getForceThemeRegistry();

	$effect.pre(() => {
		forceThemeRegistry?.register({
			id: id,
			parentId,
			forcedTheme: forcedTheme?.toString(),
			priority,
			overrideChildren,
		});

		return () => forceThemeRegistry?.unregister(id);
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
