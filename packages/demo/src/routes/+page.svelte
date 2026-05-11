<script lang="ts">
	import { ForceTheme, themeSelector } from "sv-themes";
	import { themeManager } from "$lib/theme-manager.svelte";

	let forcedTheme = $state<string | undefined>();
</script>

<main>
	<ForceTheme {themeManager} {forcedTheme} />
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
			theme: themeManager.resolvedUseSystemTheme ? themeManager.selectedTheme : "system",
 			themeManager
		}}
	>
		System
	</button>
	<hr />
	<h3>Force</h3>
	{#each themeManager.themeIds as themeId}
		<button
			type="button"
			onclick={() => {
				forcedTheme = themeId;
			}}
		>
			{themeId}
		</button>
	{/each}
	<button
		type="button"
		onclick={() => {
			forcedTheme = !themeManager.resolvedUseSystemTheme ? "system" : undefined;
		}}
	>
		System
	</button>
	<button
		type="button"
		onclick={() => {
			forcedTheme = undefined;
		}}
	>
		Unforce
	</button>
</main>

<p class="container">
	<span>Selected: <strong>{themeManager.selectedTheme}</strong></span>
	<span>Resolved: <strong>{themeManager.resolvedTheme}</strong></span>
	<span>Use system theme: <strong>{themeManager.useSystemTheme}</strong></span>
	<span>Resolved Use system theme: <strong>{themeManager.resolvedUseSystemTheme}</strong></span>
</p>

<style>
	.container {
		display: flex;
		gap: 0.5rem;
		flex-direction: column;
	}
</style>
