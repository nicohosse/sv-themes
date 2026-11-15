<script lang="ts">
	import "../app.css";
	import { startThemeActivityLog } from "#lib/themeActivity.svelte.js";
	import { registerThemeManager } from "#lib/themeManager.svelte.js";

	let { children } = $props();

	registerThemeManager();

	$effect(() => {
		return startThemeActivityLog();
	});
</script>

{@render children()}
