<script lang="ts">
	import ForceTheme from "../ForceTheme.svelte";

	interface Props {
		parentTheme?: string;
		parentPriority?: number;
		parentOverride?: boolean;
		childTheme?: string;
		childPriority?: number;
	}

	let {
		parentTheme = "light",
		parentPriority = 1,
		parentOverride = true,
		childTheme = "dark",
		childPriority = 5,
	}: Props = $props();
</script>

<ForceTheme forcedTheme={parentTheme} priority={parentPriority} overrideChildren={parentOverride}>
	<ForceTheme forcedTheme={childTheme} priority={childPriority} />
</ForceTheme>
