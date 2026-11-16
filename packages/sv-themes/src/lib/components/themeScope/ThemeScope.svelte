<script lang="ts" generics="const Themes extends ThemeRecord">
	import { BROWSER } from "esm-env";
	import { type Snippet, untrack } from "svelte";
	import { getThemeManager, setScopedThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
	import { getThemeScopeContext, setThemeScopeContext } from "#lib/contexts/themeScopeContext.svelte.js";
	import type { ThemeRecord } from "#lib/core/theme/theme.js";
	import { INTERNAL as THEME_MANAGER_INTERNAL } from "#lib/core/themeManager/themeManager.js";

	interface ThemeScopeProps<Themes extends ThemeRecord> {
		/** Theme to apply, either to the document root or to this subtree. */
		theme?: keyof Themes | "system";
		/**
		 * Where `theme` applies. `"local"` writes the theme to a wrapper around this
		 * subtree. `"global"` forces the document root while the scope is mounted.
		 * The value is read when the scope mounts, so keep it static for the
		 * component's lifetime.
		 * @default "local"
		 */
		scope?: "local" | "global";
		/** Higher priorities win between global scopes. */
		priority?: number;
		/** Prevents descendant global scopes from changing the theme. */
		overrideChildren?: boolean;
		/** Wrapper element used by a local scope. Defaults to `div`. */
		as?: keyof HTMLElementTagNameMap;
		/** Extra classes for the local wrapper. */
		class?: string;
		/** Extra inline styles for the local wrapper. */
		style?: string;
		children?: Snippet;
	}

	let {
		theme,
		scope = "local",
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
	const isGlobal = untrack(() => scope === "global");

	// Local scopes are transparent to the global forced-theme hierarchy, so
	// descendants attach to the nearest global scope instead of this one.
	if (isGlobal) setThemeScopeContext({ id, depth });

	const themeManager = getThemeManager<Themes>();

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

	if (!isGlobal) {
		// Expose the effective theme to descendants through the manager context.
		// Everything else (selected/forced state, methods, events) stays global.
		setScopedThemeManager(
			new Proxy(themeManager, {
				get(target, property, receiver) {
					if (property === "resolvedTheme") return localTheme?.id ?? Reflect.get(target, property, receiver);

					return Reflect.get(target, property, receiver);
				},
			}),
		);
	}

	$effect.pre(() => {
		// Only global scopes participate in the forced-theme competition.
		if (!isGlobal) return;

		themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.register({
			id: id,
			parentId,
			forcedTheme: theme?.toString(),
			priority,
			overrideChildren,
		});

		return () => themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.unregister(id);
	});
</script>

<svelte:head>
	{#if !BROWSER && isGlobal}
		<meta
			name="sv-themes-force-theme"
			content={encodeURIComponent(
				JSON.stringify({
					forcedTheme: theme?.toString() ?? null,
					priority,
					overrideChildren,
					depth,
				}),
			)}
		/>
	{/if}
</svelte:head>

{#if !isGlobal && theme !== undefined}
	<svelte:element this={as} class={localClassName || undefined} style={localStyle} {...localAttributes}>
		{@render children?.()}
	</svelte:element>
{:else}
	{@render children?.()}
{/if}
