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
		localTheme = "light",
		innerTheme = "light",
		innerPriority = 100,
	}: Props = $props();
</script>

<ThemeScope theme={outerTheme} scope="global" priority={0} overrideChildren={outerOverride}>
	<ThemeScope theme={localTheme} scope="local">
		<ThemeScope theme={innerTheme} scope="global" priority={innerPriority} />
	</ThemeScope>
</ThemeScope>
