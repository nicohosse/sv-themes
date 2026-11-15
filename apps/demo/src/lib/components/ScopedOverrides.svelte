<script lang="ts">
	import { ThemeScope, type ThemesOf } from "sv-themes";
	import { themeManager } from "#lib/themeManager.svelte.js";

	type DemoTheme = ThemesOf<typeof themeManager>;

	let forcedTheme = $state<DemoTheme | "system">();
	let overrideChildren = $state(false);
	let mountNested = $state(false);
	let localTheme = $state<DemoTheme | "system">("forest");

	function toggleForced(theme: DemoTheme | "system" | undefined) {
		forcedTheme = forcedTheme === theme ? undefined : theme;
	}
</script>

<section class="scope-playground" aria-labelledby="scope-heading">
	<div class="scope-controls">
		<div class="control-block">
			<p class="label" id="scope-heading">Outer scope request</p>
			<div class="button-row">
				{#each themeManager.themeIds as themeId (themeId)}
					<button
						class="btn btn-sm"
						type="button"
						class:is-active={forcedTheme === themeId}
						aria-pressed={forcedTheme === themeId}
						onclick={() => toggleForced(themeId)}
					>
						{themeId}
					</button>
				{/each}
				<button
					class="btn btn-sm"
					type="button"
					class:is-active={forcedTheme === "system"}
					aria-pressed={forcedTheme === "system"}
					onclick={() => toggleForced("system")}
				>
					system
				</button>
				<button
					class="btn btn-sm"
					type="button"
					disabled={forcedTheme === undefined}
					onclick={() => {
						forcedTheme = undefined;
					}}
				>
					clear
				</button>
			</div>
		</div>

		<div class="control-block">
			<p class="label">Scope props</p>
			<div class="switch-list">
				<label class="switch">
					<input type="checkbox" bind:checked={overrideChildren} />
					<span><code>overrideChildren</code> blocks descendants</span>
				</label>
				<label class="switch">
					<input type="checkbox" bind:checked={mountNested} />
					<span>Mount nested scope</span>
				</label>
			</div>
		</div>
	</div>

	<ThemeScope {forcedTheme} {overrideChildren}>
		<div class="scope-stage">
			<div class="stage-head">
				<div>
					<p class="label">Mounted scope tree</p>
					<p class="stage-title">
						{#if forcedTheme}
							Outer scope requests <code>{forcedTheme}</code> at <code>priority={0}</code>
						{:else}
							Outer scope has no request
						{/if}
					</p>
				</div>
				<p class="stage-meta">
					forced <b>{themeManager.forcedTheme ?? "none"}</b>
					<span>·</span>
					resolved <b>{themeManager.resolvedTheme}</b>
					<span>·</span>
					overrideChildren <b>{overrideChildren ? "on" : "off"}</b>
				</p>
			</div>

			{#if mountNested}
				<ThemeScope forcedTheme="midnight" priority={10}>
					<div class="nested-stage">
						<div>
							<p class="label">Nested ThemeScope</p>
							<p class="nested-copy">Requests <code>midnight</code> at <code>priority={10}</code></p>
						</div>
						<span class="nested-state" class:active={themeManager.forcedTheme === "midnight"}>
							{#if themeManager.forcedTheme === "midnight"}
								nested wins
							{:else if overrideChildren}
								blocked by parent
							{:else}
								waiting to apply
							{/if}
						</span>
					</div>
				</ThemeScope>
			{:else}
				<p class="stage-empty">
					Mount the nested scope to watch <code>priority</code> win and <code>overrideChildren</code> block it.
				</p>
			{/if}
		</div>
	</ThemeScope>

	<div class="local-playground">
		<div class="local-head">
			<div>
				<p class="label">Local theme</p>
				<p class="stage-title">Only this box changes. The document stays <code>{themeManager.resolvedTheme}</code>.</p>
			</div>
			<div class="button-row">
				{#each themeManager.themeIds as themeId (themeId)}
					<button
						class="btn btn-sm"
						type="button"
						class:is-active={localTheme === themeId}
						aria-pressed={localTheme === themeId}
						onclick={() => (localTheme = themeId)}
					>
						{themeId}
					</button>
				{/each}
				<button
					class="btn btn-sm"
					type="button"
					class:is-active={localTheme === "system"}
					aria-pressed={localTheme === "system"}
					onclick={() => (localTheme = "system")}
				>
					system
				</button>
			</div>
		</div>

		<ThemeScope theme={localTheme} class="local-scope">
			<div class="local-stage">
				<div>
					<p class="label">Local scope</p>
					<p class="local-copy">
						Requests <code>{localTheme}</code> for its own subtree. Open the inspector above — the root
						<code>data-theme</code>
						does not move.
					</p>
				</div>
				<span class="local-chip">{localTheme}</span>
			</div>
		</ThemeScope>
	</div>

	<p class="scope-note">
		<code>forcedTheme</code>
		changes the document while its owner is mounted. <code>theme</code> only wraps the subtree below it and never
		registers a global request. Both use the same theme attributes, so variable-driven styles follow the nearest scope.
	</p>
</section>

<style>
	.scope-playground {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.scope-controls {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		gap: 32px;
	}

	.control-block {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.button-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.switch-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.switch {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--text-soft);
		font-size: 13px;
		line-height: 1.4;
		cursor: pointer;
	}

	.switch input {
		flex: none;
		width: 14px;
		height: 14px;
		accent-color: var(--accent);
		cursor: pointer;
	}

	.scope-stage {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px;
		border: 1px solid var(--border);
		border-left: 2px solid var(--accent);
		border-radius: var(--radius);
		background: var(--surface-sunken);
	}

	.stage-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.stage-title {
		margin-top: 4px;
		font-size: 14px;
		font-weight: 500;
	}

	.stage-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.stage-meta b {
		color: var(--text-soft);
		font-weight: 500;
	}

	.nested-stage {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--border);
		border-left: 2px solid var(--accent);
		border-radius: var(--radius-sm);
		background: var(--surface);
	}

	.nested-copy {
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 13px;
	}

	.nested-state {
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.nested-state.active {
		color: var(--accent);
	}

	.stage-empty {
		color: var(--text-soft);
		font-size: 13px;
	}

	.local-playground {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.local-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.local-stage {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 20px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
	}

	.local-copy {
		max-width: 60ch;
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 13px;
		line-height: 1.5;
	}

	.local-chip {
		padding: 4px 10px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.scope-note {
		max-width: 78ch;
		color: var(--text-faint);
		font-size: 13px;
		line-height: 1.6;
	}

	@media (max-width: 760px) {
		.scope-controls {
			grid-template-columns: 1fr;
			gap: 24px;
		}
	}
</style>
