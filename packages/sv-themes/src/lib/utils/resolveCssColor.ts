import { BROWSER } from "esm-env";
import { err, ok, type Result } from "neverthrow";

let resolverElement: HTMLDivElement | undefined;

export interface ResolveCssColorError {
	message: string;
}

export function getResolverElement(): HTMLDivElement | undefined {
	if (!BROWSER) return;

	if (resolverElement) return resolverElement;

	resolverElement = document.createElement("div");
	resolverElement.style.display = "none";

	document.body.appendChild(resolverElement);

	return resolverElement;
}

const VAR_REGEX = /^var\((--[^,\s)]+)(?:,\s*(.+))?\)$/;
const MAX_VAR_DEPTH = 16;

export interface ResolveCssColorOptions {
	allowFallback?: boolean;
}

export function resolveCssColor(value: string, options?: ResolveCssColorOptions): Result<string, ResolveCssColorError> {
	return resolveCssColorWithDepth(value, options, 0);
}

function resolveCssColorWithDepth(
	value: string,
	options: ResolveCssColorOptions | undefined,
	depth: number,
): Result<string, ResolveCssColorError> {
	const resolverElement = getResolverElement();

	if (!resolverElement) return err({ message: "No DOM available for color resolution." });

	if (depth > MAX_VAR_DEPTH)
		return err({ message: `CSS variable resolution exceeded the maximum depth of ${MAX_VAR_DEPTH}.` });

	const { allowFallback = true } = options ?? {};

	const varMatch = VAR_REGEX.exec(value.trim());

	if (!varMatch) return normalizeColorToHex(value);

	const [, variableName, fallback] = varMatch;

	const variableValue = getComputedStyle(resolverElement).getPropertyValue(variableName).trim();

	if (!variableValue) {
		if (allowFallback && fallback) return resolveCssColorWithDepth(fallback, options, depth + 1);

		return err({ message: `CSS variable '${variableName}' is not defined and has no fallback.` });
	}

	return resolveCssColorWithDepth(variableValue, options, depth + 1);
}

export type RgbaTuple = [r: number, g: number, b: number, a: number];

export function rgbToHex(r: number, g: number, b: number, a = 1): string {
	const clampedR = Math.max(0, Math.min(255, Math.round(r * 255)));
	const clampedG = Math.max(0, Math.min(255, Math.round(g * 255)));
	const clampedB = Math.max(0, Math.min(255, Math.round(b * 255)));

	const channels = [clampedR, clampedG, clampedB];

	// Preserve alpha by emitting an 8-digit hex value when the color is translucent.
	if (a < 1) {
		const clampedA = Math.max(0, Math.min(255, Math.round(a * 255)));
		channels.push(clampedA);
	}

	return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

const NUMBER = "[-+]?(?:\\d*\\.\\d+|\\d+)(?:e[-+]?\\d+)?";
const OKLCH_REGEX = new RegExp(
	`oklch\\s*\\(\\s*(${NUMBER}%?)\\s+(${NUMBER})\\s+(${NUMBER})(?:deg)?(?:\\s*\\/\\s*(${NUMBER}%?))?\\s*\\)`,
	"i",
);

function parseAlpha(value?: string): number {
	if (!value) return 1;

	const parsed = value.includes("%") ? parseFloat(value) / 100 : parseFloat(value);

	return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 1;
}

export function oklchToRgb(oklch: string): RgbaTuple | undefined {
	const match = OKLCH_REGEX.exec(oklch);

	if (!match) return undefined;

	const l = match[1].includes("%") ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
	const c = parseFloat(match[2]);
	const h = parseFloat(match[3]);
	const alpha = parseAlpha(match[4]);

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

	return [r, g, b_rgb, alpha];
}

const RGB_REGEX = /rgba?\(\s*([0-9.]+%?)\s*[\s,]\s*([0-9.]+%?)\s*[\s,]\s*([0-9.]+%?)(?:\s*[,/]\s*([0-9.]+%?))?\s*\)/i;

export function parseRgb(rgb: string): RgbaTuple | undefined {
	const matches = RGB_REGEX.exec(rgb);
	if (!matches) return undefined;

	const rStr = matches[1];
	const gStr = matches[2];
	const bStr = matches[3];

	const r = rStr.includes("%") ? parseFloat(rStr) / 100 : Number(rStr) / 255;
	const g = gStr.includes("%") ? parseFloat(gStr) / 100 : Number(gStr) / 255;
	const b = bStr.includes("%") ? parseFloat(bStr) / 100 : Number(bStr) / 255;

	return [r, g, b, parseAlpha(matches[4])];
}

export function normalizeColorToHex(color: string): Result<string, ResolveCssColorError> {
	const resolverElement = getResolverElement();
	if (!resolverElement) return err({ message: "No DOM available for color resolution." });

	try {
		resolverElement.style.color = "";
		resolverElement.style.color = color;

		// Browsers silently ignore unsupported color syntax, leaving the inline style
		// empty. Checking it here turns that case into a normal Result error instead of
		// accidentally resolving to a stale or default color.
		if (!resolverElement.style.color && color.trim().toLowerCase() !== "transparent")
			return err({ message: `Unsupported CSS color '${color}'.` });

		const computedColor = getComputedStyle(resolverElement).color;

		if (!computedColor) return err({ message: `Unable to resolve CSS color '${color}'.` });

		const rgbColor = oklchToRgb(computedColor) ?? parseRgb(computedColor);

		if (!rgbColor) return err({ message: `Unsupported CSS color '${color}' (resolved to '${computedColor}').` });

		return ok(rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2], rgbColor[3]));
	} finally {
		resolverElement.style.color = "";
	}
}
