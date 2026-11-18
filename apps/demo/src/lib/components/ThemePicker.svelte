<script lang="ts">
	import { type ThemeManagerError, themeSelector } from "sv-themes";
	import { themeFeedback } from "#lib/themeFeedback.svelte.js";
	import { themeManager } from "#lib/themeManager.svelte.js";

	const activeTheme = $derived(themeManager.themes[themeManager.resolvedTheme]);

	const rawSystemTheme = $derived(
		themeManager.systemThemes.kind === "enabled" ? (themeManager.systemThemes.systemTheme ?? "detecting") : "disabled",
	);

	function reportError(error: ThemeManagerError) {
		themeFeedback.report(error);
	}
</script>

<section class="picker" aria-labelledby="picker-heading">
	<div class="active-theme">
		<span class="active-swatch" style:background={activeTheme.color ?? "var(--accent)"} aria-hidden="true"></span>
		<div class="active-copy">
			<p class="label">Resolved theme</p>
			<p class="active-name">{themeManager.resolvedTheme}</p>
			<p class="active-meta">{activeTheme.type} · {activeTheme.className ?? activeTheme.id}</p>
		</div>
		<span class="meta">{themeManager.resolvedUseSystemTheme ? "system" : "manual"}</span>
	</div>

	<div class="picker-head">
		<h2 id="picker-heading">Theme</h2>
		<span class="meta">OS {rawSystemTheme}</span>
	</div>

	<fieldset class="picker-options" aria-label="Theme preference">
		{#each themeManager.themeIds as themeId (themeId)}
			<button
				class="option"
				type="button"
				{@attach themeSelector({ theme: themeId, onError: reportError })}
				aria-pressed={!themeManager.useSystemTheme && themeManager.selectedTheme === themeId}
				style={`--swatch: ${themeManager.themes[themeId].color ?? "var(--accent)"};`}
			>
				<span class="swatch" aria-hidden="true"></span>
				<span class="option-name">{themeId}</span>
				<span class="option-type">{themeManager.themes[themeId].type}</span>
			</button>
		{/each}

		<button
			class="option"
			type="button"
			{@attach themeSelector({ theme: "system", onError: reportError })}
			aria-pressed={themeManager.useSystemTheme}
		>
			<svg
				class="system-icon"
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="4"></circle>
				<path
					d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
				></path>
			</svg>
			<span class="option-name">System</span>
			<span class="option-type">follows OS</span>
		</button>
	</fieldset>

	<div class="picker-meta">
		<span>selected <b>{themeManager.selectedTheme}</b></span>
		<span>resolved <b>{themeManager.resolvedTheme}</b></span>
		<span>follows system <b>{themeManager.useSystemTheme ? "yes" : "no"}</b></span>
		{#if themeManager.forcedTheme}
			<span>forced <b>{themeManager.forcedTheme}</b></span>
		{/if}
	</div>

	<p class="picker-note">
		Saved to a cookie and localStorage. <a href="/" target="_blank" rel="noreferrer">Open a second tab</a> and switch
		themes there to watch the storage event sync this one.
	</p>
</section>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
	}

	.active-theme {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface-sunken);
	}

	.active-swatch {
		flex: none;
		width: 40px;
		height: 40px;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
	}

	.active-copy {
		flex: 1;
		min-width: 0;
	}

	.active-name {
		margin-top: 2px;
		font-size: 20px;
		font-weight: 500;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}

	.active-meta {
		overflow: hidden;
		margin-top: 2px;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.active-theme > .meta {
		align-self: flex-start;
	}

	.picker-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.picker-head h2 {
		font-size: 14px;
	}

	.picker-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		min-width: 0;
		padding: 0;
		margin: 0;
		border: 0;
	}

	.option {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		padding: 9px 11px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		text-align: left;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	.option:hover {
		background: var(--surface-sunken);
	}

	.option[aria-pressed="true"] {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.swatch {
		flex: none;
		width: 16px;
		height: 16px;
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		background: var(--swatch);
	}

	.system-icon {
		flex: none;
		width: 16px;
		height: 16px;
		color: var(--text-soft);
	}

	.option-name {
		overflow: hidden;
		font-size: 13px;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.option-type {
		margin-left: auto;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 11.5px;
		white-space: nowrap;
	}

	.picker-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		padding-top: 16px;
		border-top: 1px solid var(--border);
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.picker-meta b {
		color: var(--text);
		font-weight: 500;
	}

	.picker-note {
		color: var(--text-soft);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.picker-note a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 420px) {
		.picker-options {
			grid-template-columns: 1fr;
		}
	}
</style>
