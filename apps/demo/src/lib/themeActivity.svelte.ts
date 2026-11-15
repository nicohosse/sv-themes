import { themeFeedback } from "./themeFeedback.svelte.js";
import { themeManager } from "./themeManager.svelte.js";

export type ThemeActivityKind = "beforeChange" | "afterChange" | "select" | "systemChange" | "forced" | "unforced";

export type ThemeActivityStage = "select" | "beforeChange";

export interface ThemeActivityEntry {
	readonly id: number;
	readonly kind: ThemeActivityKind;
	readonly message: string;
	readonly at: string;
}

function label(value: string) {
	return value === "system" ? "system" : value;
}

class ThemeActivityStore {
	entries = $state<ThemeActivityEntry[]>([]);
	cancelNextChange = $state(false);
	cancelAt = $state<ThemeActivityStage>("beforeChange");

	#nextId = 0;

	record(kind: ThemeActivityKind, message: string) {
		this.entries = [
			{
				id: this.#nextId++,
				kind,
				message,
				at: new Date().toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				}),
			},
			...this.entries,
		].slice(0, 40);
	}

	clear() {
		this.entries = [];
	}

	consumeCancellation(stage: ThemeActivityStage) {
		if (!this.cancelNextChange || this.cancelAt !== stage) return false;

		this.cancelNextChange = false;
		return true;
	}
}

export const themeActivity = new ThemeActivityStore();

let stopLog: (() => void) | undefined;

/**
 * Registers the demo event listeners once. Returns an unsubscribe function so the
 * layout can tie the listeners to the component lifetime.
 */
export function startThemeActivityLog() {
	if (stopLog) return stopLog;

	const unsubscribers = [
		themeManager.on("select", (event) => {
			const cancelled = themeActivity.consumeCancellation("select");

			if (cancelled) event.preventDefault();

			themeActivity.record("select", `${label(event.from)} → ${label(event.to)}${cancelled ? " · cancelled" : ""}`);
		}),

		themeManager.on("beforeChange", (event) => {
			const cancelled = themeActivity.consumeCancellation("beforeChange");

			if (cancelled) event.preventDefault();

			themeActivity.record(
				"beforeChange",
				`${label(event.from)} → ${label(event.to)}${cancelled ? " · cancelled" : ""}`,
			);
		}),

		themeManager.on("afterChange", (event) => {
			themeFeedback.clear();
			themeActivity.record("afterChange", `${label(event.from)} → ${label(event.to)}`);
		}),

		themeManager.on("systemChange", (event) => {
			themeActivity.record("systemChange", `OS ${event.systemTheme} mapped to ${event.resolvedSystemTheme}`);
		}),

		themeManager.on("forced", (event) => {
			themeActivity.record("forced", `Forced ${label(event.theme)}`);
		}),

		themeManager.on("unforced", () => {
			themeActivity.record("unforced", "Forced theme cleared");
		}),
	];

	stopLog = () => {
		for (const unsubscribe of unsubscribers) unsubscribe();
		stopLog = undefined;
	};

	return stopLog;
}
