<script lang="ts">
	import ThemeScope from "../ThemeScope.svelte";

	interface Props {
		outerTheme?: string;
		outerOverride?: boolean;
		localTheme?: string;
		innerTheme?: string;
		innerPriority?: number;
	}

	let {
		outerTheme = "dark",
		outerOverride = true,
		localTheme = "forest",
		innerTheme = "light",
		innerPriority = 100,
	}: Props = $props();
</script>

<ThemeScope forcedTheme={outerTheme} priority={0} overrideChildren={outerOverride}>
	<ThemeScope theme={localTheme}> <ThemeScope forcedTheme={innerTheme} priority={innerPriority} /> </ThemeScope>
</ThemeScope>
