<script lang="ts">
	import { getThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";

	interface Props {
		id: string;
	}

	let { id }: Props = $props();

	const themeManager = getThemeManager();
</script>

<span
	data-probe={id}
	data-resolved-theme={themeManager.resolvedTheme}
	data-resolved-use-system-theme={themeManager.resolvedUseSystemTheme}
	data-selected-theme={themeManager.selectedTheme}
	data-forced-theme={themeManager.forcedTheme ?? "none"}
	>{themeManager.resolvedTheme}</span
>
