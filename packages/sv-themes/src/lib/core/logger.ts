import type { ThemeRecord } from "./theme/index.js";
import type { ThemeManager } from "./theme-manager/index.js";

export function logInfo<const Themes extends ThemeRecord>(message: string, themeManager?: ThemeManager<Themes>) {
	if (themeManager && !themeManager.enableLogging) return;
	console.info(message);
}

export function logError<const Themes extends ThemeRecord>(message: string, themeManager?: ThemeManager<Themes>) {
	if (themeManager && !themeManager.enableLogging) return;
	console.error(message);
}
