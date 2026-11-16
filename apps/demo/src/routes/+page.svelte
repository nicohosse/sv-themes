<script lang="ts">
	import EventLog from "#lib/components/EventLog.svelte";
	import FeatureGrid from "#lib/components/FeatureGrid.svelte";
	import ScopedOverrides from "#lib/components/ScopedOverrides.svelte";
	import StateInspector from "#lib/components/StateInspector.svelte";
	import ThemeGallery from "#lib/components/ThemeGallery.svelte";
	import ThemePicker from "#lib/components/ThemePicker.svelte";
	import { themeFeedback } from "#lib/themeFeedback.svelte.js";
	import { themeManager } from "#lib/themeManager.svelte.js";

	const repoUrl = "https://github.com/nicohosse/sv-themes";
	const npmUrl = "https://www.npmjs.com/package/sv-themes";

	$effect(() => {
		if (!themeManager.forcedTheme) themeFeedback.clear();
	});
</script>

<header class="site-header">
	<div class="wrap header-inner">
		<a class="brand" href="/" aria-label="sv-themes home">
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"></circle>
				<path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"></path>
			</svg>
			<span>sv-themes</span>
		</a>

		<nav class="nav" aria-label="Page sections">
			<a href="#state">State</a>
			<a href="#themes">Themes</a>
			<a href="#scopes">Scopes</a>
			<a href="#events">Events</a>
			<a href="#features">Features</a>
		</nav>

		<div class="header-actions">
			<a class="header-link" href={npmUrl} target="_blank" rel="noreferrer">npm</a>
			<a class="btn" href={repoUrl} target="_blank" rel="noreferrer">GitHub</a>
		</div>
	</div>
</header>

<main class="wrap">
	<section class="hero">
		<div class="hero-copy">
			<p class="label">Svelte 5 · SvelteKit 3 · MIT</p>
			<h1>The right theme before the first paint</h1>
			<p class="lede">
				sv-themes resolves the active theme on the server, applies it in an inline boot script, and keeps components,
				tabs, and scoped trees in sync. No hydration mismatch, no flash of the wrong theme.
			</p>

			<div class="hero-actions">
				<code class="install-command"><span aria-hidden="true">$</span> npm i sv-themes</code>
				<a class="btn btn-primary" href={repoUrl} target="_blank" rel="noreferrer">View source</a>
			</div>

			<p class="hero-note">
				This page is the demo app. Change a theme and inspect the manager, the document attributes, and the event stream
				below.
			</p>
		</div>

		<div class="hero-demo"><ThemePicker /></div>
	</section>

	<section class="section" id="state">
		<div class="section-grid">
			<p class="section-index" aria-hidden="true">01</p>
			<div class="section-content">
				<header class="section-head">
					<h2>Live state</h2>
					<p>
						The root layout registers a four-theme manager. Every value below is read from the live manager or from the
						attributes it applied to the document.
					</p>
				</header>
				<StateInspector />
			</div>
		</div>
	</section>

	<section class="section" id="themes">
		<div class="section-grid">
			<p class="section-index" aria-hidden="true">02</p>
			<div class="section-content">
				<header class="section-head">
					<h2>Themes</h2>
					<p>
						Each theme declares a type, color, favicon, and optional class name. OS dark maps to
						<code>midnight</code>, and selecting a card uses the <code>themeSelector</code> action.
					</p>
				</header>
				<ThemeGallery />
			</div>
		</div>
	</section>

	<section class="section" id="scopes">
		<div class="section-grid">
			<p class="section-index" aria-hidden="true">03</p>
			<div class="section-content">
				<header class="section-head">
					<h2>Scopes</h2>
					<p>
						<code>ThemeScope</code>
						applies a <code>theme</code> to its own subtree by default. Add
						<code>scope="global"</code>
						to force the document root instead: higher priority wins, a parent with
						<code>overrideChildren</code>
						blocks descendants, and unmounting cleans up automatically.
					</p>
				</header>
				<ScopedOverrides />
			</div>
		</div>
	</section>

	<section class="section" id="events">
		<div class="section-grid">
			<p class="section-index" aria-hidden="true">04</p>
			<div class="section-content">
				<header class="section-head">
					<h2>Events</h2>
					<p>
						Six typed events. Arm a cancellation stage, then change a theme to watch
						<code>preventDefault()</code>
						stop the transition.
					</p>
				</header>
				<EventLog />
			</div>
		</div>
	</section>

	<section class="section" id="features">
		<div class="section-grid">
			<p class="section-index" aria-hidden="true">05</p>
			<div class="section-content">
				<header class="section-head">
					<h2>Capabilities</h2>
					<p>The client surface this page exercises, plus the parts that only run during the server lifecycle.</p>
				</header>
				<FeatureGrid />
			</div>
		</div>
	</section>

	{#if themeFeedback.error}
		<div class="alert" role="alert">
			<div class="alert-copy">
				<p class="alert-title">
					<span class="alert-id">{themeFeedback.error.id}</span>
					{themeFeedback.error.message}
				</p>
				<p class="alert-hint">
					The library is protecting the active forced theme. Dismiss this or clear the scope below.
				</p>
			</div>
			<button class="btn btn-sm" type="button" onclick={() => themeFeedback.clear()}>Dismiss</button>
		</div>
	{/if}
</main>

<footer class="wrap site-footer">
	<p class="footer-note">MIT licensed. Built for Svelte 5 and SvelteKit 3.</p>
	<nav class="footer-links" aria-label="Project links">
		<a href={npmUrl} target="_blank" rel="noreferrer">npm</a>
		<a href={repoUrl} target="_blank" rel="noreferrer">GitHub</a>
		<a href={`${repoUrl}#readme`} target="_blank" rel="noreferrer">Documentation</a>
		<a href={repoUrl} target="_blank" rel="noreferrer">License</a>
	</nav>
</footer>

<style>
	.site-header {
		border-bottom: 1px solid var(--border);
	}

	.header-inner {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 24px;
		height: 60px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		justify-self: start;
		color: var(--text);
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.01em;
		text-decoration: none;
	}

	.brand svg {
		color: var(--text-soft);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.nav a,
	.header-link {
		color: var(--text-soft);
		font-size: 13px;
		text-decoration: none;
		transition: color 120ms ease;
	}

	.nav a:hover,
	.header-link:hover {
		color: var(--text);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 16px;
		justify-self: end;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(320px, 0.82fr);
		align-items: center;
		gap: clamp(32px, 6vw, 80px);
		padding: clamp(40px, 7vw, 80px) 0 clamp(40px, 6vw, 64px);
	}

	.hero-copy h1 {
		max-width: 15ch;
		margin-top: 12px;
		font-size: clamp(2.25rem, 5vw, 3.5rem);
		letter-spacing: -0.035em;
		line-height: 1.05;
	}

	.lede {
		max-width: 52ch;
		margin-top: 20px;
		color: var(--text-soft);
		font-size: 16px;
		line-height: 1.65;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		margin-top: 28px;
	}

	.install-command {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--text-soft);
		font-family: var(--font-mono);
		font-size: 12.5px;
		user-select: all;
	}

	.install-command span {
		color: var(--text-faint);
	}

	.hero-note {
		max-width: 48ch;
		margin-top: 24px;
		color: var(--text-faint);
		font-size: 13px;
		line-height: 1.55;
	}

	.hero-demo {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		background: var(--surface);
	}

	.section {
		padding: 48px 0;
		border-top: 1px solid var(--border);
		scroll-margin-top: 16px;
	}

	.section-grid {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr);
		gap: 24px;
	}

	.section-index {
		padding-top: 5px;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.section-content {
		min-width: 0;
	}

	.section-head {
		max-width: 72ch;
		margin-bottom: 24px;
	}

	.section-head h2 {
		font-size: clamp(1.4rem, 2.4vw, 1.75rem);
	}

	.section-head p {
		margin-top: 10px;
		color: var(--text-soft);
		font-size: 15px;
		line-height: 1.65;
	}

	.alert {
		position: fixed;
		z-index: 30;
		right: max(24px, calc((100vw - var(--max-width)) / 2));
		bottom: 24px;
		display: flex;
		gap: 16px;
		width: min(420px, calc(100vw - 32px));
		padding: 14px 16px;
		border: 1px solid var(--border-strong);
		border-left: 3px solid var(--danger);
		border-radius: var(--radius);
		background: var(--surface-raised);
		box-shadow: 0 12px 32px -24px rgb(0 0 0 / 45%);
	}

	.alert-copy {
		min-width: 0;
	}

	.alert-title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		color: var(--text);
		font-size: 13px;
		font-weight: 500;
	}

	.alert-id {
		color: var(--danger);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.alert-hint {
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 12.5px;
		line-height: 1.5;
	}

	.alert .btn {
		align-self: flex-start;
		margin-left: auto;
	}

	.site-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 32px 0 48px;
		border-top: 1px solid var(--border);
	}

	.footer-note {
		color: var(--text-faint);
		font-size: 13px;
	}

	.footer-links {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
	}

	.footer-links a {
		color: var(--text-soft);
		font-size: 13px;
		text-decoration: none;
	}

	.footer-links a:hover {
		color: var(--text);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
		}

		.hero-copy h1 {
			max-width: 18ch;
		}
	}

	@media (max-width: 820px) {
		.header-inner {
			grid-template-columns: 1fr auto;
		}

		.nav {
			display: none;
		}
	}

	@media (max-width: 720px) {
		.section-grid {
			grid-template-columns: 1fr;
			gap: 8px;
		}

		.section-index {
			padding-top: 0;
		}
	}

	@media (max-width: 560px) {
		.alert {
			right: 16px;
			bottom: 16px;
		}
	}
</style>
