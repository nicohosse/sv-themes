<script lang="ts" generics="const Themes extends ThemeRecord">
	import { BROWSER } from "esm-env";
	import { type Snippet, untrack } from "svelte";
	import { getThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
	import { getThemeScopeContext, setThemeScopeContext } from "#lib/contexts/themeScopeContext.svelte.js";
	import type { ThemeRecord } from "#lib/core/theme/theme.js";
	import { INTERNAL as THEME_MANAGER_INTERNAL } from "#lib/core/themeManager/themeManager.js";

	interface ThemeScopeProps<Themes extends ThemeRecord> {
		/**
		 * Applies a theme globally (to the document root) while this scope is mounted.
		 * Use `theme` for a scope that only affects its own subtree.
		 */
		forcedTheme?: keyof Themes | "system";
		/**
		 * Applies a theme to this subtree only. The theme is written to a wrapper
		 * element and never mutates the document root, the manager's selected
		 * state, storage, or the global forced-theme registry.
		 */
		theme?: keyof Themes | "system";
		priority?: number;
		overrideChildren?: boolean;
		/** Wrapper element used by a local `theme`. Defaults to `div`. */
		as?: keyof HTMLElementTagNameMap;
		/** Extra classes for the local wrapper. */
		class?: string;
		/** Extra inline styles for the local wrapper. */
		style?: string;
		children?: Snippet;
	}

	let {
		forcedTheme,
		theme,
		priority = 0,
		overrideChildren = false,
		as = "div",
		class: className,
		style,
		children,
	}: ThemeScopeProps<Themes> = $props();

	const id = Symbol("theme-scope");
	const parent = getThemeScopeContext();
	const parentId = parent?.id;
	const depth = (parent?.depth ?? -1) + 1;
	const isLocalOnly = untrack(() => theme !== undefined && forcedTheme === undefined);

	// Local-only scopes are transparent to the global forced-theme hierarchy, so
	// descendants attach to the nearest global scope instead of this one.
	if (!isLocalOnly) setThemeScopeContext({ id, depth });

	let themeManager = getThemeManager<Themes>();

	const localTheme = $derived.by(() => {
		if (theme === undefined) return undefined;

		if (theme === "system") {
			if (themeManager.systemThemes.kind === "enabled")
				return themeManager.themes[
					themeManager.systemThemes.mappings[themeManager.systemThemes.systemTheme ?? "light"]
				];

			return themeManager.themes[themeManager.resolvedTheme];
		}

		return Object.hasOwn(themeManager.themes, theme) ? themeManager.themes[theme] : undefined;
	});

	const localClassName = $derived.by(() => {
		const classes: string[] = [];

		if (localTheme && themeManager.attributes.includes("class")) classes.push(localTheme.className ?? localTheme.id);
		if (className) classes.push(className);

		return classes.join(" ");
	});

	const localAttributes = $derived.by(() => {
		const attributes: Record<string, string> = {};

		if (!localTheme) return attributes;

		for (const attribute of themeManager.attributes) if (attribute !== "class") attributes[attribute] = localTheme.id;

		return attributes;
	});

	const localStyle = $derived.by(() => {
		const styles: string[] = [];

		if (localTheme && themeManager.useColorScheme) styles.push(`color-scheme: ${localTheme.type};`);

		// A scoped theme should not introduce a layout box of its own. Consumers that
		// need a visible container can override this through `style`.
		styles.push("display: contents;");

		if (style) styles.push(style);

		return styles.join(" ");
	});

	$effect.pre(() => {
		// A local-only scope must stay out of the global forced-theme competition.
		// Otherwise its empty request could clear a sibling's global forced theme.
		if (theme !== undefined && forcedTheme === undefined) return;

		themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.register({
			id: id,
			parentId,
			forcedTheme: forcedTheme?.toString(),
			priority,
			overrideChildren,
		});

		return () => themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.unregister(id);
	});
</script>

<svelte:head>
	{#if !BROWSER && !(theme !== undefined && forcedTheme === undefined)}
		<meta
			name="sv-themes-force-theme"
			content={encodeURIComponent(
				JSON.stringify({
					forcedTheme: forcedTheme?.toString() ?? null,
					priority,
					overrideChildren,
					depth,
				}),
			)}
		/>
	{/if}
</svelte:head>

{#if theme !== undefined}
	<svelte:element this={as} class={localClassName || undefined} style={localStyle} {...localAttributes}>
		{@render children?.()}
	</svelte:element>
{:else}
	{@render children?.()}
{/if}
