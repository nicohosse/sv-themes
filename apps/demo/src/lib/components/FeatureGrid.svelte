<script lang="ts">
	import Icon from "#lib/components/Icon.svelte";
	import type { IconName } from "#lib/icons.js";

	const features: { icon: IconName; title: string; copy: string }[] = [
		{
			icon: "server",
			title: "Request-isolated snapshots",
			copy: "The SvelteKit handle resolves persistence and forced themes into a per-request snapshot, so concurrent requests never share state.",
		},
		{
			icon: "eye-off",
			title: "No flash of the wrong theme",
			copy: "An inline head script applies the resolved theme before first paint, then removes itself. CSP nonces are supported.",
		},
		{
			icon: "zap",
			title: "Svelte 5 runes",
			copy: "resolvedTheme, selectedTheme, forcedTheme, and system state are reactive getters. Components update on their own.",
		},
		{
			icon: "layers",
			title: "Scoped themes",
			copy: 'ThemeScope applies a theme to its own subtree by default, or to the document with mode="global". Priorities and parent locks apply globally, with unmount cleanup and SSR parity.',
		},
		{
			icon: "refresh-cw",
			title: "Cross-tab sync",
			copy: "Storage events align open tabs as soon as a theme changes, through localStorage or sessionStorage.",
		},
		{
			icon: "database",
			title: "Persistence",
			copy: "Cookies, localStorage, and sessionStorage are coordinated by priority, with synchronous reads during client initialization.",
		},
		{
			icon: "monitor",
			title: "Theme-aware head",
			copy: "theme-color, color-scheme, and per-theme favicons follow the resolved theme. Alpha channels survive color resolution.",
		},
		{
			icon: "radio",
			title: "Typed lifecycle events",
			copy: "Six events, from select and beforeChange to forced and unforced. preventDefault() cancels a transition.",
		},
		{
			icon: "code",
			title: "Works without SvelteKit",
			copy: "The sv-themes/spa entry is DOM-free and exports a boot script for client-only Svelte and Vite apps.",
		},
		{
			icon: "braces",
			title: "Type-safe by construction",
			copy: "createThemes infers theme IDs, and ThemesOf types props, actions, and helpers so invalid IDs fail at compile time.",
		},
		{
			icon: "git-branch",
			title: "Context-aware attachments",
			copy: "themeSelector and the components resolve the manager from Svelte context. Registration collisions return a typed error.",
		},
		{
			icon: "flask-conical",
			title: "Tested across the surface",
			copy: "Vitest covers SSR snapshots, persistence fallbacks, DOM updates, event cancellation, scoped overrides, and error paths.",
		},
	];
</script>

<div class="features">
	<div class="feature-list">
		{#each features as feature (feature.title)}
			<article class="feature">
				<span class="feature-icon"><Icon name={feature.icon} /></span>
				<div>
					<h3>{feature.title}</h3>
					<p>{feature.copy}</p>
				</div>
			</article>
		{/each}
	</div>

	<div class="wiring">
		<div class="wire-step">
			<span class="step">01</span>
			<div>
				<strong>Define</strong>
				<code>createAppThemeManager(&#123;themes, ...&#125;)</code>
			</div>
		</div>
		<div class="wire-step">
			<span class="step">02</span>
			<div>
				<strong>Resolve on the server</strong>
				<code>createThemeHandle(() =&gt; manager)</code>
			</div>
		</div>
		<div class="wire-step">
			<span class="step">03</span>
			<div>
				<strong>Register on the client</strong>
				<code>registerThemeManager()</code>
			</div>
		</div>
	</div>
</div>

<style>
	.features {
		display: flex;
		flex-direction: column;
		gap: 32px;
	}

	.feature-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: 48px;
		border-bottom: 1px solid var(--border);
	}

	.feature {
		display: flex;
		gap: 12px;
		padding: 16px 0;
		border-top: 1px solid var(--border);
	}

	.feature-icon {
		flex: none;
		margin-top: 2px;
		color: var(--text-faint);
	}

	.feature h3 {
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	.feature p {
		max-width: 46ch;
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 13px;
		line-height: 1.55;
	}

	.wiring {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.wire-step {
		display: flex;
		gap: 12px;
		padding: 16px;
	}

	.wire-step + .wire-step {
		border-left: 1px solid var(--border);
	}

	.step {
		flex: none;
		padding-top: 1px;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 11.5px;
		font-variant-numeric: tabular-nums;
	}

	.wire-step strong {
		display: block;
		font-size: 13px;
		font-weight: 500;
	}

	.wire-step code {
		display: block;
		margin-top: 4px;
		color: var(--text-soft);
		font-family: var(--font-mono);
		font-size: 12px;
		overflow-wrap: anywhere;
	}

	@media (max-width: 760px) {
		.feature-list {
			grid-template-columns: 1fr;
		}

		.wiring {
			grid-template-columns: 1fr;
		}

		.wire-step + .wire-step {
			border-top: 1px solid var(--border);
			border-left: 0;
		}
	}
</style>
