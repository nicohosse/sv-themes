<script lang="ts" generics="const Themes extends ThemeRecord">
	import { BROWSER } from "esm-env";
	import { type Snippet, untrack } from "svelte";
	import { getThemeManager, setScopedThemeManager } from "#lib/contexts/themeManagerContext.svelte.js";
	import { getThemeScopeContext, setThemeScopeContext } from "#lib/contexts/themeScopeContext.svelte.js";
	import { logWarn } from "#lib/core/logger.js";
	import { safeSerializeArgument } from "#lib/core/script.js";
	import type { ThemeRecord } from "#lib/core/theme/theme.js";
	import { INTERNAL as THEME_MANAGER_INTERNAL } from "#lib/core/themeManager/themeManager.js";

	/** Tags that can safely wrap children; void and document-level tags are excluded. */
	type LocalWrapperTag = Exclude<
		keyof HTMLElementTagNameMap,
		| "area"
		| "base"
		| "body"
		| "br"
		| "col"
		| "embed"
		| "head"
		| "hr"
		| "html"
		| "img"
		| "input"
		| "link"
		| "meta"
		| "param"
		| "script"
		| "source"
		| "style"
		| "template"
		| "title"
		| "track"
		| "wbr"
	>;

	interface ThemeScopePrePaint {
		storage: "localStorage" | "sessionStorage";
		key: string;
	}

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
		mode?: "local" | "global";
		/** Higher priorities win between global scopes. */
		priority?: number;
		/** Prevents descendant global scopes from changing the theme. */
		overrideChildren?: boolean;
		/** Wrapper element used by a local scope. Defaults to `div`. */
		as?: LocalWrapperTag;
		/** Extra classes for the local wrapper. */
		class?: string;
		/** Extra inline styles for the local wrapper. */
		style?: string;
		/** CSP nonce for the pre-paint boot script of a local `theme="system"` scope. */
		cspNonce?: string;
		/**
		 * Reads a persisted local theme from browser storage before first paint.
		 * The stored value must be a registered theme id or `"system"`; `theme`
		 * remains the server-rendered fallback. The value seeds the scope at
		 * mount, and a later `theme` prop update takes over. Only applies to
		 * local scopes.
		 */
		prepaint?: ThemeScopePrePaint;
		children?: Snippet;
		/** Additional attributes, such as `id`, `aria-*`, or event handlers, forwarded to a local wrapper. */
		[attribute: string]: unknown;
	}

	let {
		theme,
		mode = "local",
		priority = 0,
		overrideChildren = false,
		as = "div",
		class: className,
		style,
		cspNonce,
		prepaint,
		children,
		...rest
	}: ThemeScopeProps<Themes> = $props();

	const id = Symbol("theme-scope");
	const parent = getThemeScopeContext();
	const parentId = parent?.id;
	const depth = (parent?.depth ?? -1) + 1;
	const initialMode = untrack(() => mode);
	const isGlobal = initialMode === "global";
	const initialTheme = untrack(() => theme);
	const initialPrepaint = untrack(() => prepaint);

	// Local scopes are transparent to the global forced-theme hierarchy, so
	// descendants attach to the nearest global scope instead of this one.
	if (isGlobal) setThemeScopeContext({ id, depth });

	const themeManager = getThemeManager<Themes>();

	if (!isGlobal) {
		const initialPriority = untrack(() => priority);
		const initialOverrideChildren = untrack(() => overrideChildren);

		if (initialPriority !== 0 || initialOverrideChildren)
			logWarn(
				'ThemeScope: `priority` and `overrideChildren` only apply to `mode="global"`; they are ignored here.',
				themeManager,
			);
	} else if (initialPrepaint) {
		logWarn('ThemeScope: `prepaint` only applies to `mode="local"`; it is ignored here.', themeManager);
	}

	let warnedModeChange = false;

	$effect(() => {
		if (mode === initialMode || warnedModeChange) return;

		warnedModeChange = true;
		logWarn("ThemeScope: `mode` is read when the scope mounts. Remount the component to change it.", themeManager);
	});

	// `prepaint` lets a persisted local theme win over the server-rendered
	// fallback. It is read once on mount; the boot script repeats that read
	// before hydration so first paint and the hydrated tree agree.
	const initialPrepaintTheme = untrack(() => {
		if (!initialPrepaint || !BROWSER) return undefined;

		try {
			const storage = initialPrepaint.storage === "localStorage" ? localStorage : sessionStorage;
			return storage.getItem(initialPrepaint.key) ?? undefined;
		} catch {
			return undefined;
		}
	});

	let prepaintTheme = $state<keyof Themes | "system" | undefined>(
		initialPrepaintTheme === "system"
			? "system"
			: initialPrepaintTheme && Object.hasOwn(themeManager.themes, initialPrepaintTheme)
				? (initialPrepaintTheme as keyof Themes)
				: undefined,
	);

	const localThemeId = $derived(prepaintTheme ?? theme);

	// `prepaint` seeds the scope. Once the consumer updates the `theme` prop, the
	// prop takes over, so runtime theme switching keeps working.
	let previousTheme = initialTheme;

	$effect.pre(() => {
		if (theme === previousTheme) return;

		previousTheme = theme;
		prepaintTheme = undefined;
	});

	const localTheme = $derived.by(() => {
		if (localThemeId === undefined) return undefined;

		if (localThemeId === "system") {
			if (themeManager.systemThemes.kind === "enabled")
				return themeManager.themes[
					themeManager.systemThemes.mappings[themeManager.systemThemes.systemTheme ?? "light"]
				];

			return themeManager.themes[themeManager.resolvedTheme];
		}

		return Object.hasOwn(themeManager.themes, localThemeId) ? themeManager.themes[localThemeId] : undefined;
	});

	const localResolvedUseSystemTheme = $derived.by(() => {
		if (!localTheme) return themeManager.resolvedUseSystemTheme;
		if (localThemeId !== "system") return false;

		// With system themes disabled, the local scope follows the manager's
		// resolved theme, so inherit the manager's system state as well.
		return themeManager.systemThemes.kind === "enabled" ? true : themeManager.resolvedUseSystemTheme;
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

	function toBootTheme(themeId: keyof Themes | undefined) {
		if (!themeId) return null;

		const theme = themeManager.themes[themeId];

		if (!theme) return null;

		return { id: theme.id, c: theme.className ?? theme.id, t: theme.type };
	}

	// Local scopes are outside the head boot script, which only reaches `<html>`.
	// Serialize what a tiny inline script needs to align this wrapper before
	// hydration, either from the OS preference or a persisted local theme.
	const localBootScript = $derived.by(() => {
		if (isGlobal || (!initialPrepaint && localThemeId !== "system")) return undefined;

		const mappings = themeManager.systemThemes.kind === "enabled" ? themeManager.systemThemes.mappings : undefined;

		return safeSerializeArgument({
			a: themeManager.attributes,
			l: toBootTheme(mappings?.light),
			d: toBootTheme(mappings?.dark),
			ts: themeManager.themeIds.map((id) => {
				const theme = themeManager.themes[id];

				return { id: theme.id, c: theme.className ?? theme.id, t: theme.type };
			}),
			ac: themeManager.themeIds.map((id) => themeManager.themes[id].className ?? id),
			cs: themeManager.useColorScheme,
			p: initialPrepaint ? { s: initialPrepaint.storage, k: initialPrepaint.key } : undefined,
			// The server-rendered fallback is `system`, so an empty persisted
			// value (or no persisted value at all) still resolves system here.
			sys: localThemeId === "system",
		});
	});

	if (!isGlobal) {
		// Expose the effective theme to descendants through the manager context.
		// Everything else (selected/forced state, methods, events) stays global.
		setScopedThemeManager(
			new Proxy(themeManager, {
				get(target, property, receiver) {
					if (property === "resolvedTheme") return localTheme?.id ?? Reflect.get(target, property, receiver);
					if (property === "resolvedUseSystemTheme") return localResolvedUseSystemTheme;

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

{#if !isGlobal && (localThemeId !== undefined || initialPrepaint !== undefined)}
	<svelte:element this={as} {...rest} class={localClassName || undefined} style={localStyle} {...localAttributes}>
		{@render children?.()}
	</svelte:element>
	{#if !BROWSER && localBootScript !== undefined}
		<script nonce={cspNonce} data-sv-themes-boot={localBootScript}>
			(() => {
				const script = document.currentScript;
				if (!script) return;
				try {
					const wrapper = script.previousElementSibling;
					if (!wrapper) return;
					const config = JSON.parse(script.dataset.svThemesBoot ?? "null");
					if (!config) return;
					let themeId;
					if (config.p) {
						try {
							themeId = globalThis[config.p.s].getItem(config.p.k) || undefined;
						} catch {}
					}
					if (!themeId && config.sys) themeId = "system";
					let theme;
					if (themeId === "system") {
						if (config.l) {
							theme = globalThis.matchMedia("(prefers-color-scheme: dark)").matches ? config.d : config.l;
						} else {
							// System themes are disabled, so the resolved theme comes
							// from the document-level boot script instead.
							for (const attribute of config.a) {
								if (attribute === "class") {
									theme = config.ts.find((candidate) => document.documentElement.classList.contains(candidate.c));
								} else {
									const value = document.documentElement.getAttribute(attribute);
									theme = value && config.ts.find((candidate) => candidate.id === value);
								}

								if (theme) break;
							}
						}
					} else if (themeId) theme = config.ts.find((candidate) => candidate.id === themeId);
					if (!theme) return;
					for (const attribute of config.a) {
						if (attribute === "class") {
							wrapper.classList.remove(...config.ac);
							wrapper.classList.add(theme.c);
						} else wrapper.setAttribute(attribute, theme.id);
					}
					if (config.cs) wrapper.style.colorScheme = theme.t;
				} finally {
					script.remove();
				}
			})();
		</script>
	{/if}
{:else}
	{@render children?.()}
{/if}
