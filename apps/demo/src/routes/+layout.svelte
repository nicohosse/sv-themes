<script lang="ts">
	import { registerThemeManager } from "#lib/themeManager.svelte.js";

	let { children } = $props();

	registerThemeManager();
</script>

{@render children()}
