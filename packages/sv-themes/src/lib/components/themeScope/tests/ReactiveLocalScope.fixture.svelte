<script lang="ts">
	import ThemeScope from "../ThemeScope.svelte";

	let theme = $state("dark");

	function toggleTheme() {
		theme = theme === "dark" ? "light" : "dark";
	}
</script>

<button type="button" id="toggle-theme" onclick={toggleTheme}>Toggle theme</button>

<ThemeScope {theme}> <span id="reactive-content">Reactive local theme</span> </ThemeScope>
