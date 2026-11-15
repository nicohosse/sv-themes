<script lang="ts">
	import { type IconName, iconPaths } from "#lib/icons.js";

	let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#each iconPaths[name] as path (path)}
		<path d={path}></path>
	{/each}
</svg>
