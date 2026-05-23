import { BROWSER } from "esm-env";

let resolverElement: HTMLDivElement | undefined;

export function getResolverElement(): HTMLDivElement | undefined {
	if (!BROWSER) return;

	if (resolverElement) return resolverElement;

	resolverElement = document.createElement("div");
	resolverElement.style.display = "none";

	document.body.appendChild(resolverElement);

	return resolverElement;
}

const VAR_REGEX = /^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/;

interface ResolveCssColorOptions {
	allowFallback?: boolean;
}

export function resolveCssColor(value: string, options?: ResolveCssColorOptions): string | undefined {
	const resolverElement = getResolverElement();
	if (!resolverElement) return;

	const { allowFallback = true } = options ?? {};

	const varMatch = VAR_REGEX.exec(value);

	if (!varMatch) return normalizeColor(value);

	const [, variableName, fallback] = varMatch;

	const variableValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();

	if (!variableValue) {
		if (allowFallback && fallback) return normalizeColor(fallback);
		return undefined;
	}

	return normalizeColor(variableValue);
}

export function normalizeColor(color: string): string {
	const resolverElement = getResolverElement();
	if (!resolverElement) throw new Error("No DOM available for color resolution.");

	resolverElement.style.color = color;

	return getComputedStyle(resolverElement).color;
}
