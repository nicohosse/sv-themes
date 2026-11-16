import type { ThemeRecord } from "./theme/index.js";
import type { ThemeManager } from "./themeManager/index.js";

export function logInfo<const Themes extends ThemeRecord>(message: string, themeManager?: ThemeManager<Themes>) {
	if (themeManager && !themeManager.enableLogging) return;
	console.info(message);
}

export function logWarn<const Themes extends ThemeRecord>(message: string, themeManager?: ThemeManager<Themes>) {
	if (themeManager && !themeManager.enableLogging) return;
	console.warn(message);
}

export function logError<const Themes extends ThemeRecord>(message: string, themeManager?: ThemeManager<Themes>) {
	if (themeManager && !themeManager.enableLogging) return;
	console.error(message);
}
