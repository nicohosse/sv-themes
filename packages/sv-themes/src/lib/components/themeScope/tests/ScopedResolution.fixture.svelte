<script lang="ts">
	import { setThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
	import { createThemes } from "#lib/core/theme/theme.js";
	import { createThemeManager } from "#lib/core/themeManager/createThemeManager.svelte.js";
	import ThemeScope from "../ThemeScope.svelte";
	import ResolvedThemeProbe from "./ResolvedThemeProbe.svelte";

	const themes = createThemes([
		{ id: "light", type: "light" },
		{ id: "dark", type: "dark" },
		{ id: "forest", type: "light" },
	]);

	const themeManagerResult = createThemeManager({
		themes,
		initialTheme: "light",
		systemThemes: { kind: "disabled" },
		enableLogging: false,
	});

	if (themeManagerResult.isErr()) throw new Error("Could not create the test theme manager.");

	setThemeManager(themeManagerResult.value);

	let outerTheme = $state("forest");
</script>

<ResolvedThemeProbe id="outside" />

<button
	type="button"
	id="cycle-local-theme"
	onclick={() => {
		outerTheme = outerTheme === "forest" ? "dark" : "forest";
	}}
>
	Cycle local theme
</button>

<ThemeScope theme={outerTheme}>
	<ResolvedThemeProbe id="outer" />
	<ThemeScope theme="light"> <ResolvedThemeProbe id="inner" /> </ThemeScope>
</ThemeScope>
