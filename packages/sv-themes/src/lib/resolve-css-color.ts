import { BROWSER } from "esm-env";

type ResolveCssColorOptions = {
	allowFallback?: boolean;
};

const resolverElement = BROWSER ? document.createElement("div") : undefined;

if (resolverElement) {
	resolverElement.style.display = "none";
	document.body.appendChild(resolverElement);
}

const VAR_REGEX = /^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/;

export function resolveCssColor(value: string, options: ResolveCssColorOptions = {}): string | undefined {
	if (!resolverElement) return;

	const { allowFallback = true } = options;

	const varMatch = VAR_REGEX.exec(value);

	if (!varMatch) return normalizeColor(value);

	const [, variableName, fallback] = varMatch;

	const variableValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

	if (!variableValue) {
		if (allowFallback && fallback) return normalizeColor(fallback);
		return undefined;
	}

	return normalizeColor(value);
}

function normalizeColor(color: string): string {
	if (!resolverElement) {
		throw new Error("No DOM available for color resolution.");
	}

	resolverElement.style.color = color;

	return getComputedStyle(resolverElement).color;
}
