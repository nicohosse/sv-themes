<script lang="ts">
	import ThemeScope from "../ThemeScope.svelte";

	let theme = $state<"light" | "sepia">("light");
</script>

<button type="button" id="set-sepia-theme" onclick={() => (theme = "sepia")}>Sepia theme</button>

<ThemeScope {theme} prepaint={{ storage: "localStorage", key: "scope-theme" }}>
	<span id="prepaint-content">Prepainted local theme</span>
</ThemeScope>
