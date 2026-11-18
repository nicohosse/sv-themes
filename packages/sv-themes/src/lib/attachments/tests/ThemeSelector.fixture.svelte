<script lang="ts">
	import { setContext } from "svelte";
	import { THEME_MANAGER_CONTEXT_SYMBOL } from "#lib/contexts/themeManagerContext.svelte.js";
	import type { ThemeManager } from "#lib/core/themeManager/themeManager.js";
	import { themeSelector } from "../themeSelector.svelte.js";

	interface Props {
		themeManager: ThemeManager;
	}

	let { themeManager }: Props = $props();

	// The manager is registered once for the lifetime of the fixture.
	// svelte-ignore state_referenced_locally
	setContext(THEME_MANAGER_CONTEXT_SYMBOL, themeManager);

	let theme = $state<"light" | "dark">("light");
</script>

<button type="button" id="toggle-theme" onclick={() => (theme = theme === "light" ? "dark" : "light")}>
	toggle theme
</button>

<button type="button" id="theme-button" {@attach themeSelector({ theme })}>theme</button>
