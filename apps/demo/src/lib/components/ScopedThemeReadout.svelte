<script lang="ts">
	import { getThemeManager } from "sv-themes";

	// Must be read during component initialization: Svelte context is not
	// available inside event handlers or effects.
	const themeManager = getThemeManager();
</script>

<span class="scoped-readout">
	<code>getThemeManager().resolvedTheme</code>
	<b>{themeManager.resolvedTheme}</b>
</span>

<style>
	.scoped-readout {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-faint);
		font-size: 12px;
	}

	.scoped-readout code {
		color: var(--text-faint);
	}

	.scoped-readout b {
		color: var(--text-soft);
		font-weight: 500;
	}
</style>
