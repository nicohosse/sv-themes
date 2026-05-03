<script lang="ts">
	import { themeManager } from "../lib/default-theme-manager.ts";
</script>

<main>
	{#each themeManager.themeIds as theme}
		<button
			type="button"
			onclick={() => themeManager.setTheme(theme)}
			aria-pressed={themeManager.selectedTheme === theme}
		>
			{theme}
		</button>
	{/each}
	<button type="button" onclick={() => themeManager.setTheme("system")} aria-pressed={themeManager.useSystemTheme}>
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
