<script lang="ts">
	import { themeManager } from "../lib/default-theme-manager.ts";
	import { registerThemeManager } from "../lib/theme-manager.svelte.ts";

	let { children } = $props();

	registerThemeManager(themeManager);
</script>

{@render children()}
