<script lang="ts">
	import ThemeScope from "../ThemeScope.svelte";

	interface Props {
		outerTheme?: string;
		innerTheme?: string;
	}

	let { outerTheme = "dark", innerTheme = "light" }: Props = $props();
</script>

<ThemeScope theme={outerTheme}>
	<div id="outer-content">
		<ThemeScope theme={innerTheme}> <span id="inner-content">Local theme</span> </ThemeScope>
	</div>
</ThemeScope>
