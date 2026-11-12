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

	if (!varMatch) return normalizeColorToHex(value);

	const [, variableName, fallback] = varMatch;

	const variableValue = getComputedStyle(resolverElement).getPropertyValue(variableName).trim();

	if (!variableValue) {
		if (allowFallback && fallback) return resolveCssColor(fallback, options);
		return undefined;
	}

	return resolveCssColor(variableValue, options);
}

export function rgbToHex(r: number, g: number, b: number): string {
	const clampedR = Math.max(0, Math.min(255, Math.round(r * 255)));
	const clampedG = Math.max(0, Math.min(255, Math.round(g * 255)));
	const clampedB = Math.max(0, Math.min(255, Math.round(b * 255)));

	return `#${[clampedR, clampedG, clampedB].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const OKLCH_REGEX = /oklch\s*\(\s*([0-9.]+%?)\s+([0-9.]+)\s+([0-9.]+)(?:deg)?(?:\s*\/\s*[0-9.%]+)?\s*\)/i;

export function oklchToRgb(oklch: string): [r: number, g: number, b: number] | undefined {
	const match = OKLCH_REGEX.exec(oklch);

	if (!match) return undefined;

	let l = parseFloat(match[1]);
	const c = parseFloat(match[2]);
	const h = parseFloat(match[3]);

	if (oklch.includes("%")) l = l / 100;

	const hRad = (h * Math.PI) / 180;
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);

	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;

	const l3 = l_ * l_ * l_;
	const m3 = m_ * m_ * m_;
	const s3 = s_ * s_ * s_;

	let r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
	let g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
	let b_rgb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

	const linearToSrgb = (value: number): number =>
		value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;

	r = linearToSrgb(r);
	g = linearToSrgb(g);
	b_rgb = linearToSrgb(b_rgb);

	return [r, g, b_rgb];
}

const RGB_REGEX = /rgba?\(\s*([0-9.]+%?)\s*[\s,]\s*([0-9.]+%?)\s*[\s,]\s*([0-9.]+%?)/i;

export function parseRgb(rgb: string): [r: number, g: number, b: number] {
	const matches = RGB_REGEX.exec(rgb);
	if (!matches) throw new Error(`Unsupported color: ${rgb}`);

	const rStr = matches[1];
	const gStr = matches[2];
	const bStr = matches[3];

	const r = rStr.includes("%") ? parseFloat(rStr) / 100 : Number(rStr) / 255;
	const g = gStr.includes("%") ? parseFloat(gStr) / 100 : Number(gStr) / 255;
	const b = bStr.includes("%") ? parseFloat(bStr) / 100 : Number(bStr) / 255;

	return [r, g, b];
}

export function normalizeColorToHex(color: string): string {
	const resolverElement = getResolverElement();
	if (!resolverElement) throw new Error("No DOM available for color resolution.");

	resolverElement.style.color = color;

	const computedColor = getComputedStyle(resolverElement).color;
	const rgbColor = oklchToRgb(computedColor) ?? parseRgb(computedColor);
	const normalizedColor = rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2]);

	resolverElement.style.color = "";

	return normalizedColor;
}
