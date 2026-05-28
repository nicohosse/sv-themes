<script lang="ts">
	import { registerThemeManager } from "$lib/theme-manager.svelte";

	let { children } = $props();

	registerThemeManager();
</script>

{@render children()}
