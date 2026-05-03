<script lang="ts">
	import { registerThemeManager } from "sv-themes";
	import { themeManager } from "$lib/theme-manager.svelte";

	let { children } = $props();

	registerThemeManager(themeManager);
</script>

{@render children()}
