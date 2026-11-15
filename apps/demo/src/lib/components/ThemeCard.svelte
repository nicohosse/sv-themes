<script lang="ts">
	import { type ThemeManagerError, type ThemesOf, themeSelector } from "sv-themes";
	import { themeFeedback } from "#lib/themeFeedback.svelte.js";
	import { themeManager } from "#lib/themeManager.svelte.js";

	let { themeId }: { themeId: ThemesOf<typeof themeManager> } = $props();

	const PREVIEWS: Record<string, { background: string; foreground: string; accent: string; onAccent: string }> = {
		light: { background: "#f5f5f3", foreground: "#1b1b18", accent: "#c43a05", onAccent: "#ffffff" },
		dark: { background: "#141413", foreground: "#ecece6", accent: "#ff7040", onAccent: "#170b04" },
		forest: { background: "#eef1ec", foreground: "#1c2a21", accent: "#2c6e49", onAccent: "#ffffff" },
		midnight: { background: "#15131a", foreground: "#ece8f2", accent: "#b49bea", onAccent: "#191120" },
	};

	const theme = $derived(themeManager.themes[themeId]);
	const preview = $derived(
		PREVIEWS[themeId] ?? {
			background: "var(--surface)",
			foreground: "var(--text)",
			accent: "var(--accent)",
			onAccent: "var(--accent-contrast)",
		},
	);
	const systemMappings = $derived(
		themeManager.systemThemes.kind === "enabled" ? themeManager.systemThemes.mappings : undefined,
	);

	function reportError(error: ThemeManagerError) {
		themeFeedback.report(error);
	}
</script>

<button
	class="theme-card"
	type="button"
	class:is-resolved={themeManager.resolvedTheme === themeId}
	use:themeSelector={{ theme: themeId, onError: reportError }}
	aria-pressed={!themeManager.useSystemTheme && themeManager.selectedTheme === themeId}
	style={`--preview-bg: ${preview.background}; --preview-fg: ${preview.foreground}; --preview-accent: ${preview.accent}; --preview-on-accent: ${preview.onAccent};`}
>
	<span class="preview" aria-hidden="true">
		<span class="preview-top">
			<span class="preview-sample">Aa</span>
			{#if theme.favicon}
				<img src={theme.favicon} alt="" width="18" height="18" />
			{/if}
		</span>
		<span class="preview-line">Appearance</span>
		<span class="preview-controls">
			<span class="preview-primary">Primary</span>
			<span class="preview-secondary">Secondary</span>
		</span>
	</span>

	<span class="card-body">
		<span class="card-top">
			<strong class="card-name">{themeId}</strong>
			<span class="card-type">{theme.type}</span>
		</span>

		<span class="card-rows">
			<span class="row">
				<span>class</span>
				<code>{theme.className ?? theme.id}</code>
			</span>
			<span class="row">
				<span>color</span>
				<code>{theme.color ?? "—"}</code>
			</span>
		</span>

		<span class="card-state">
			{#if themeManager.resolvedTheme === themeId}
				<span class="state-resolved">resolved</span>
			{/if}
			{#if themeManager.selectedTheme === themeId}
				<span>selected</span>
			{/if}
			{#if themeManager.forcedTheme === themeId}
				<span class="state-forced">forced</span>
			{/if}
			{#if systemMappings?.light === themeId}
				<span>OS light</span>
			{/if}
			{#if systemMappings?.dark === themeId}
				<span>OS dark</span>
			{/if}
		</span>
	</span>
</button>

<style>
	.theme-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		text-align: left;
		transition: border-color 120ms ease;
	}

	.theme-card:hover {
		border-color: var(--border-strong);
	}

	.theme-card[aria-pressed="true"] {
		border-color: var(--accent);
	}

	.theme-card.is-resolved {
		border-color: var(--border-strong);
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-height: 128px;
		padding: 16px;
		border-bottom: 1px solid var(--border);
		background: var(--preview-bg);
		color: var(--preview-fg);
	}

	.preview-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
	}

	.preview-sample {
		font-size: 32px;
		font-weight: 500;
		letter-spacing: -0.03em;
		line-height: 1;
	}

	.preview-top img {
		width: 18px;
		height: 18px;
		border-radius: 4px;
	}

	.preview-line {
		color: color-mix(in srgb, var(--preview-fg) 62%, transparent);
		font-size: 11px;
		line-height: 1.4;
	}

	.preview-controls {
		display: flex;
		gap: 6px;
		margin-top: auto;
	}

	.preview-primary,
	.preview-secondary {
		padding: 5px 9px;
		border-radius: 4px;
		font-size: 11px;
		line-height: 1;
	}

	.preview-primary {
		background: var(--preview-accent);
		color: var(--preview-on-accent);
	}

	.preview-secondary {
		border: 1px solid color-mix(in srgb, var(--preview-fg) 28%, transparent);
		color: var(--preview-fg);
	}

	.card-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px 16px;
	}

	.card-top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.card-name {
		font-size: 14px;
		font-weight: 500;
	}

	.card-type {
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 11.5px;
	}

	.card-rows {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--border);
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 6px 0;
		border-bottom: 1px solid var(--border);
		font-size: 12px;
	}

	.row > span {
		color: var(--text-faint);
	}

	.row code {
		overflow: hidden;
		max-width: 70%;
		color: var(--text-soft);
		font-family: var(--font-mono);
		font-size: 11.5px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-state {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		min-height: 17px;
		margin-top: auto;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 11.5px;
	}

	.state-resolved {
		color: var(--accent);
	}

	.state-forced {
		color: var(--warn);
	}
</style>
