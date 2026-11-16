<script lang="ts">
	import ThemeScope from "../ThemeScope.svelte";

	let theme = $state<"dark" | "light">("dark");
	let mode = $state<"local" | "global">("local");
</script>

<button type="button" id="set-invalid-theme" onclick={() => (theme = "missing" as "light")}>Invalid theme</button>
<button type="button" id="set-light-theme" onclick={() => (theme = "light")}>Light theme</button>
<button type="button" id="set-global-mode" onclick={() => (mode = "global")}>Global mode</button>

<ThemeScope {theme} {mode}> <span id="mutable-content">Mutable local theme</span> </ThemeScope>
