<script lang="ts">
	import { type ThemeActivityKind, type ThemeActivityStage, themeActivity } from "#lib/themeActivity.svelte.js";

	const stages: ThemeActivityStage[] = ["select", "beforeChange"];

	const kindLabels: Record<ThemeActivityKind, string> = {
		beforeChange: "beforeChange",
		afterChange: "afterChange",
		select: "select",
		systemChange: "systemChange",
		forced: "forced",
		unforced: "unforced",
	};

	function setStage(stage: ThemeActivityStage) {
		themeActivity.cancelAt = stage;
	}
</script>

<div class="event-panel">
	<div class="event-toolbar">
		<div class="cancel-copy">
			<p class="label">Cancellation</p>
			<p>
				Arm a stage, then change the theme. The listener calls <code>preventDefault()</code> and the transition is
				reported as cancelled.
			</p>
		</div>

		<div class="cancel-actions">
			<fieldset class="segmented" aria-label="Cancellation stage">
				{#each stages as stage (stage)}
					<button
						class="btn btn-sm"
						type="button"
						class:is-active={themeActivity.cancelAt === stage}
						aria-pressed={themeActivity.cancelAt === stage}
						onclick={() => setStage(stage)}
					>
						{stage}
					</button>
				{/each}
			</fieldset>

			<button
				class="btn btn-sm arm"
				type="button"
				aria-pressed={themeActivity.cancelNextChange}
				onclick={() => {
					themeActivity.cancelNextChange = !themeActivity.cancelNextChange;
				}}
			>
				{#if themeActivity.cancelNextChange}
					<span class="armed-dot" aria-hidden="true"></span>
					Cancellation armed
				{:else}
					Arm cancellation
				{/if}
			</button>
		</div>
	</div>

	<div class="log-panel">
		<div class="log-head">
			<p class="label">Event stream</p>
			<div class="log-actions">
				<span class="meta">{themeActivity.entries.length} / 40</span>
				<button
					class="btn btn-sm"
					type="button"
					disabled={themeActivity.entries.length === 0}
					onclick={() => themeActivity.clear()}
				>
					Clear
				</button>
			</div>
		</div>

		{#if themeActivity.entries.length === 0}
			<div class="log-empty">
				<p>No events yet</p>
				<p>Pick a theme, follow the system, or mount a scoped override to populate the stream.</p>
			</div>
		{:else}
			<div class="log-columns" aria-hidden="true">
				<span>event</span>
				<span>detail</span>
				<span>time</span>
			</div>
			<ol class="log" aria-live="polite">
				{#each themeActivity.entries as entry (entry.id)}
					<li class="log-entry">
						<span class="kind kind-{entry.kind}">{kindLabels[entry.kind]}</span>
						<span class="message">{entry.message}</span>
						<time class="time">{entry.at}</time>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</div>

<style>
	.event-panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.event-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 20px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.cancel-copy {
		flex: 1 1 18rem;
	}

	.cancel-copy p:last-child {
		max-width: 56ch;
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 13px;
		line-height: 1.55;
	}

	.cancel-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.segmented {
		display: inline-flex;
		gap: 2px;
		min-width: 0;
		padding: 2px;
		margin: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-sunken);
	}

	.segmented .btn {
		border-color: transparent;
		background: transparent;
		color: var(--text-soft);
	}

	.segmented .btn:hover {
		background: var(--surface);
	}

	.segmented .btn.is-active {
		border-color: var(--border-strong);
		background: var(--surface-raised);
		color: var(--text);
	}

	.arm[aria-pressed="true"] {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent);
	}

	.armed-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentcolor;
	}

	.log-panel {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.log-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}

	.log-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.log-columns,
	.log-entry {
		display: grid;
		grid-template-columns: 9rem minmax(0, 1fr) auto;
		align-items: center;
		gap: 16px;
	}

	.log-columns {
		padding: 8px 16px;
		border-bottom: 1px solid var(--border);
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 11.5px;
	}

	.log {
		overflow-y: auto;
		max-height: 320px;
		padding: 0;
		margin: 0;
		list-style: none;
	}

	.log-entry {
		padding: 10px 16px;
		border-bottom: 1px solid var(--border);
	}

	.log-entry:last-child {
		border-bottom: 0;
	}

	.kind {
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.kind-beforeChange {
		color: var(--warn);
	}

	.kind-afterChange {
		color: var(--ok);
	}

	.kind-select {
		color: var(--accent);
	}

	.kind-systemChange,
	.kind-forced {
		color: var(--text-soft);
	}

	.kind-unforced {
		color: var(--text-faint);
	}

	.message {
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 12px;
		overflow-wrap: anywhere;
	}

	.time {
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.log-empty {
		padding: 32px 20px;
	}

	.log-empty p:first-child {
		color: var(--text);
		font-size: 13px;
		font-weight: 500;
	}

	.log-empty p:last-child {
		max-width: 60ch;
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 13px;
		line-height: 1.55;
	}

	@media (max-width: 640px) {
		.log-columns {
			display: none;
		}

		.log-entry {
			grid-template-columns: 1fr;
			gap: 4px;
			padding: 12px 16px;
		}

		.time {
			justify-self: start;
		}
	}
</style>
