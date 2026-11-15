<script lang="ts">
	import ThemeCard from "#lib/components/ThemeCard.svelte";
	import { themeManager } from "#lib/themeManager.svelte.js";
</script>

<div class="theme-grid">
	{#each themeManager.themeIds as themeId (themeId)}
		<ThemeCard {themeId} />
	{/each}
</div>

<style>
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	@media (max-width: 980px) {
		.theme-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.theme-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
