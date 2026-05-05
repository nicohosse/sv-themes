interface ThemeScriptArguments {
	storageKey?: string;
}

function themeScript(storageKey: string) {}

export function getThemeScript(config: ThemeScriptArguments) {
	const fn = themeScript.toString().replace(/\s*__name\s*\([^)]*\)\s*;?\s*/g, "");
	const args = [JSON.stringify(config.storageKey)].join(",");
	return `(${fn})(${args})`;
}
