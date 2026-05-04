<script lang="ts">
	import { themeSelector } from "sv-themes";
	import { themeManager } from "$lib/theme-manager.svelte";
</script>

<main>
	{#each themeManager.themeIds as themeId}
		<button
			type="button"
			use:themeSelector={{
				theme: themeId,
		 		themeManager
			}}
		>
			{themeId}
		</button>
	{/each}
	<button
		type="button"
		use:themeSelector={{
			theme: "system",
 			themeManager
		}}
	>
		System
	</button>
</main>

<p class="container">
	<span>Selected: <strong>{themeManager.selectedTheme}</strong></span>
	<span>Resolved: <strong>{themeManager.resolvedTheme}</strong></span>
	<span>Use system theme: <strong>{themeManager.useSystemTheme}</strong></span>
</p>

<style>
	.container {
		display: flex;
		gap: 0.5rem;
		flex-direction: column;
	}
</style>
