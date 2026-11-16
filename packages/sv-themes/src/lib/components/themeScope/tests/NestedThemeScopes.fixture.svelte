<script lang="ts">
	import ThemeScope from "../ThemeScope.svelte";

	interface Props {
		parentTheme?: string;
		parentPriority?: number;
		parentOverride?: boolean;
		childTheme?: string;
		childPriority?: number;
		childOverride?: boolean;
		grandchildTheme?: string;
		grandchildPriority?: number;
	}

	let {
		parentTheme = "light",
		parentPriority = 1,
		parentOverride = true,
		childTheme = "dark",
		childPriority = 5,
		childOverride = false,
		grandchildTheme,
		grandchildPriority = 10,
	}: Props = $props();
</script>

<ThemeScope theme={parentTheme} scope="global" priority={parentPriority} overrideChildren={parentOverride}>
	<ThemeScope theme={childTheme} scope="global" priority={childPriority} overrideChildren={childOverride}>
		{#if grandchildTheme !== undefined}
			<ThemeScope theme={grandchildTheme} scope="global" priority={grandchildPriority} />
		{/if}
	</ThemeScope>
</ThemeScope>
