<script lang="ts">
	import { themeFeedback } from "#lib/themeFeedback.svelte.js";
	import { themeManager } from "#lib/themeManager.svelte.js";

	let htmlClass = $state("—");
	let dataTheme = $state("—");
	let forcedAttribute = $state("—");
	let systemAttribute = $state("—");
	let colorSchemeStyle = $state("—");
	let themeColorMeta = $state("—");
	let colorSchemeMeta = $state("—");
	let faviconHref = $state("—");
	let persistedLocal = $state("—");
	let persistedCookie = $state("—");

	let lastResult = $state("No programmatic call yet.");

	const systemTheme = $derived(
		themeManager.systemThemes.kind === "enabled" ? (themeManager.systemThemes.systemTheme ?? "detecting") : "disabled",
	);

	const storageMethods = $derived(themeManager.storage ? themeManager.storage.methods.join(" → ") : "disabled");

	function readPersistedValues() {
		try {
			persistedLocal = globalThis.localStorage.getItem("sv-themes-demo") ?? "—";
		} catch {
			persistedLocal = "unavailable";
		}

		const cookie = document.cookie
			.split(";")
			.map((entry) => entry.trim())
			.find((entry) => entry.startsWith("sv-themes-demo="));

		if (!cookie) {
			persistedCookie = "—";
			return;
		}

		try {
			persistedCookie = decodeURIComponent(cookie.slice("sv-themes-demo=".length));
		} catch {
			persistedCookie = cookie.slice("sv-themes-demo=".length);
		}
	}

	$effect(() => {
		readPersistedValues();

		return themeManager.on("afterChange", readPersistedValues);
	});

	$effect(() => {
		// Read the reactive state that drives the DOM update before inspecting it.
		themeManager.resolvedTheme;
		themeManager.forcedTheme;
		themeManager.resolvedUseSystemTheme;

		const root = document.documentElement;

		htmlClass = root.getAttribute("class") ?? "—";
		dataTheme = root.getAttribute("data-theme") ?? "—";
		forcedAttribute = root.getAttribute(themeManager.isThemeForcedAttribute ?? "data-is-theme-forced") ?? "—";
		systemAttribute = root.getAttribute(themeManager.isSystemThemeAttribute ?? "data-is-system-theme") ?? "—";
		colorSchemeStyle = root.style.colorScheme || "—";
		themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content || "—";
		colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content || "—";
		faviconHref = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.getAttribute("href") || "—";
	});

	async function toggleSystemTheme() {
		const next = !themeManager.useSystemTheme;
		const result = await themeManager.setUseSystemTheme(next);

		if (result.isOk()) {
			lastResult = `setUseSystemTheme(${next}) → Ok`;
			themeFeedback.clear();
			return;
		}

		lastResult = `setUseSystemTheme(${next}) → Err(${result.error.id})`;
		themeFeedback.report(result.error);
	}

	async function selectForest() {
		const result = await themeManager.setSelectedTheme("forest");

		if (result.isOk()) {
			lastResult = 'setSelectedTheme("forest") → Ok';
			themeFeedback.clear();
			return;
		}

		lastResult = `setSelectedTheme("forest") → Err(${result.error.id})`;
		themeFeedback.report(result.error);
	}
</script>

<div class="inspector">
	<div class="inspector-grid">
		<section class="panel">
			<div class="panel-head">
				<p class="label">Manager state</p>
				<span class="meta">reactive</span>
			</div>

			<dl class="kv">
				<div class="kv-row">
					<dt>resolvedTheme</dt>
					<dd><code>{themeManager.resolvedTheme}</code></dd>
				</div>
				<div class="kv-row">
					<dt>selectedTheme</dt>
					<dd><code>{themeManager.selectedTheme}</code></dd>
				</div>
				<div class="kv-row">
					<dt>forcedTheme</dt>
					<dd><code>{themeManager.forcedTheme ?? "undefined"}</code></dd>
				</div>
				<div class="kv-row">
					<dt>useSystemTheme</dt>
					<dd><span class="bool" class:on={themeManager.useSystemTheme}>{themeManager.useSystemTheme}</span></dd>
				</div>
				<div class="kv-row">
					<dt>resolvedUseSystemTheme</dt>
					<dd>
						<span class="bool" class:on={themeManager.resolvedUseSystemTheme}>
							{themeManager.resolvedUseSystemTheme}
						</span>
					</dd>
				</div>
				<div class="kv-row">
					<dt>systemTheme</dt>
					<dd><code>{systemTheme}</code></dd>
				</div>
				<div class="kv-row">
					<dt>isForcedThemeLocked</dt>
					<dd>
						<span class="bool" class:on={themeManager.isForcedThemeLocked}> {themeManager.isForcedThemeLocked} </span>
					</dd>
				</div>
				<div class="kv-row">
					<dt>initialTheme</dt>
					<dd><code>{themeManager.initialTheme}</code></dd>
				</div>
			</dl>
		</section>

		<section class="panel">
			<div class="panel-head">
				<p class="label">Applied document</p>
				<span class="meta">live DOM</span>
			</div>

			<dl class="kv">
				<div class="kv-row">
					<dt>html class</dt>
					<dd><code>{htmlClass}</code></dd>
				</div>
				<div class="kv-row">
					<dt>data-theme</dt>
					<dd><code>{dataTheme}</code></dd>
				</div>
				<div class="kv-row">
					<dt>{themeManager.isThemeForcedAttribute ?? "forced attr"}</dt>
					<dd><code>{forcedAttribute}</code></dd>
				</div>
				<div class="kv-row">
					<dt>{themeManager.isSystemThemeAttribute ?? "system attr"}</dt>
					<dd><code>{systemAttribute}</code></dd>
				</div>
				<div class="kv-row">
					<dt>style color-scheme</dt>
					<dd><code>{colorSchemeStyle}</code></dd>
				</div>
				<div class="kv-row">
					<dt>meta theme-color</dt>
					<dd class="inline-value">
						<span
							class="color-dot"
							style:background={themeColorMeta === "—" ? "transparent" : themeColorMeta}
							aria-hidden="true"
						></span>
						<code>{themeColorMeta}</code>
					</dd>
				</div>
				<div class="kv-row">
					<dt>meta color-scheme</dt>
					<dd><code>{colorSchemeMeta}</code></dd>
				</div>
				<div class="kv-row">
					<dt>favicon</dt>
					<dd><code>{faviconHref}</code></dd>
				</div>
			</dl>
		</section>

		<section class="panel">
			<div class="panel-head">
				<p class="label">Configuration</p>
				<span class="meta">resolved</span>
			</div>

			<dl class="kv">
				<div class="kv-row">
					<dt>themes</dt>
					<dd><code>{themeManager.themeIds.join(", ")}</code></dd>
				</div>
				<div class="kv-row">
					<dt>attributes</dt>
					<dd><code>{themeManager.attributes.join(", ")}</code></dd>
				</div>
				<div class="kv-row">
					<dt>storage methods</dt>
					<dd><code>{storageMethods}</code></dd>
				</div>
				<div class="kv-row">
					<dt>storage key</dt>
					<dd><code>{themeManager.storage?.key ?? "—"}</code></dd>
				</div>
				<div class="kv-row">
					<dt>cookie name</dt>
					<dd><code>{themeManager.storage?.cookie.name ?? "—"}</code></dd>
				</div>
				<div class="kv-row">
					<dt>persisted localStorage</dt>
					<dd><code>{persistedLocal}</code></dd>
				</div>
				<div class="kv-row">
					<dt>persisted cookie</dt>
					<dd><code>{persistedCookie}</code></dd>
				</div>
				<div class="kv-row">
					<dt>enableTabSync</dt>
					<dd><span class="bool" class:on={themeManager.enableTabSync}>{themeManager.enableTabSync}</span></dd>
				</div>
				<div class="kv-row">
					<dt>enableLogging</dt>
					<dd><span class="bool" class:on={themeManager.enableLogging}>{themeManager.enableLogging}</span></dd>
				</div>
				<div class="kv-row">
					<dt>hasLightTheme</dt>
					<dd><span class="bool" class:on={themeManager.hasLightTheme}>{themeManager.hasLightTheme}</span></dd>
				</div>
				<div class="kv-row">
					<dt>hasDarkTheme</dt>
					<dd><span class="bool" class:on={themeManager.hasDarkTheme}>{themeManager.hasDarkTheme}</span></dd>
				</div>
				<div class="kv-row">
					<dt>useColorScheme</dt>
					<dd><span class="bool" class:on={themeManager.useColorScheme}>{themeManager.useColorScheme}</span></dd>
				</div>
				<div class="kv-row">
					<dt>useThemeColor</dt>
					<dd><span class="bool" class:on={themeManager.useThemeColor}>{themeManager.useThemeColor}</span></dd>
				</div>
				<div class="kv-row">
					<dt>useFavicon</dt>
					<dd><span class="bool" class:on={themeManager.useFavicon}>{themeManager.useFavicon}</span></dd>
				</div>
			</dl>
		</section>
	</div>

	<div class="api-panel">
		<div>
			<p class="label">Programmatic API</p>
			<p class="api-copy">
				Both calls return <code>ResultAsync&lt;void, ThemeManagerError&gt;</code>. This demo inspects
				<code>isOk()</code>
				and surfaces failures in the alert.
			</p>
		</div>
		<div class="api-actions">
			<button class="btn btn-sm" type="button" onclick={toggleSystemTheme}>
				setUseSystemTheme({!themeManager.useSystemTheme})
			</button>
			<button class="btn btn-sm" type="button" onclick={selectForest}>setSelectedTheme("forest")</button>
		</div>
		<p class="api-result">{lastResult}</p>
	</div>
</div>

<style>
	.inspector {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.inspector-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.panel-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.kv {
		display: flex;
		flex-direction: column;
		margin: 0;
	}

	.kv-row {
		display: grid;
		grid-template-columns: minmax(8.5rem, 1fr) minmax(0, 1.2fr);
		align-items: center;
		gap: 12px;
		padding: 7px 0;
		border-bottom: 1px solid var(--border);
	}

	.kv-row:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}

	.kv dt {
		color: var(--text-soft);
		font-size: 12.5px;
	}

	.kv dd {
		min-width: 0;
		margin: 0;
	}

	.kv code {
		display: inline-block;
		overflow: hidden;
		max-width: 100%;
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 12px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inline-value {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.color-dot {
		flex: none;
		width: 10px;
		height: 10px;
		border: 1px solid var(--border-strong);
		border-radius: 2px;
	}

	.bool {
		color: var(--text-faint);
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.bool.on {
		color: var(--ok);
	}

	.api-panel {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px 16px;
		padding: 20px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.api-copy {
		max-width: 64ch;
		margin-top: 4px;
		color: var(--text-soft);
		font-size: 13px;
		line-height: 1.55;
	}

	.api-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.api-result {
		grid-column: 1 / -1;
		margin-top: 8px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--code-bg);
		color: var(--text-soft);
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}

	@media (max-width: 720px) {
		.api-panel {
			grid-template-columns: 1fr;
		}

		.api-actions {
			margin-top: 4px;
		}
	}
</style>
