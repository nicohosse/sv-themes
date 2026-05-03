import { err, ok, type Result } from "neverthrow";
import { browser } from "$app/environment";
import { ThemeManagerError } from "./theme-manager.errors.js";

export type ThemeAttribute = "class" | `data-${string}`;

export interface Theme {
	id: string;
	type: "light" | "dark";
	// Hex or css variable
	color?: string;
}

export type ThemesRecord<Keys extends string = string> = Record<Keys, Readonly<Theme>>;

export function createThemes<const Themes extends readonly Theme[]>(themes: Themes) {
	return Object.fromEntries(themes.map((theme) => [theme.id, theme])) as ThemesRecord<Themes[number]["id"]>;
}

export const DEFAULT_THEMES = createThemes([
	{ id: "light", type: "light", color: "#fff" },
	{ id: "dark", type: "dark", color: "#000" },
]);

export type DefaultTheme = keyof typeof DEFAULT_THEMES;

export type SystemTheme = "light" | "dark";

const INTERNAL = Symbol("internal");

export interface ThemeManager<Themes extends ThemesRecord> {
	readonly themes: Themes;
	readonly themeIds: (keyof Themes)[];

	useSystemTheme?: boolean;
	readonly enableSystemThemes?: boolean;
	readonly systemThemes?: Partial<Record<SystemTheme, keyof Themes>>;

	resolvedTheme: keyof Themes;
	selectedTheme?: keyof Themes;
	setSelectedTheme: (theme: keyof Themes) => Result<void, ThemeManagerError>;
	setTheme: (theme: keyof Themes | "system") => Result<void, ThemeManagerError>;

	readonly useColorScheme?: boolean;

	readonly hasLightTheme?: boolean;
	readonly hasDarkTheme?: boolean;
	readonly hasLightSystemTheme?: boolean;
	readonly hasDarkSystemTheme?: boolean;

	readonly attributes: ThemeAttribute[];
	readonly themeClasses?: Partial<Record<keyof Themes, string>>;

	[INTERNAL]: {
		systemTheme?: SystemTheme;
	};
}

function validateRequestedTheme<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
	requestedTheme: keyof Themes,
): Result<void, ThemeManagerError> {
	if (!themeManager.themeIds.includes(requestedTheme)) return err(ThemeManagerError.themeNotFound);

	return ok();
}

function validateThemeManager<const Themes extends ThemesRecord>(
	themeManager: ThemeManager<Themes>,
): Result<void, ThemeManagerError[]> {
	if (themeManager.themeIds.length < 1) return err([ThemeManagerError.noThemes]);

	if (themeManager.enableSystemThemes) {
		const errors = [];

		if (!themeManager.hasLightSystemTheme) errors.push(ThemeManagerError.systemThemeUnassigned("light"));
		if (!themeManager.hasDarkSystemTheme) errors.push(ThemeManagerError.systemThemeUnassigned("dark"));

		if (errors.length > 0) return err(errors);
	}

	return ok();
}

function resolveSystemThemes<const Themes extends ThemesRecord>(
	systemThemes?: Partial<Record<SystemTheme, keyof Themes>>,
): Record<SystemTheme, keyof Themes> {
	return {
		light: systemThemes?.light ?? "light",
		dark: systemThemes?.dark ?? "dark",
	};
}

type CreateThemeManagerInput<Themes extends ThemesRecord> = {
	initialTheme: keyof Themes;
	enableSystemThemes?: boolean;
} & Omit<
	ThemeManager<Themes>,
	| "setTheme"
	| "themeIds"
	| "attributes"
	| "useColorScheme"
	| "useSystemTheme"
	| "resolvedTheme"
	| "setSelectedTheme"
	| typeof INTERNAL
> &
	Partial<Pick<ThemeManager<Themes>, "attributes" | "useColorScheme" | "useSystemTheme">>;

export function createThemeManager<const Themes extends ThemesRecord>({
	themes,
	initialTheme,
	enableSystemThemes = true,
	useColorScheme = true,
	useSystemTheme = true,
	systemThemes,
	attributes = ["class", "data-theme"],
	themeClasses,
}: CreateThemeManagerInput<Themes>): Result<ThemeManager<Themes>, ThemeManagerError[]> {
	const state = $state({
		useSystemTheme,
		selectedTheme: initialTheme,
		systemTheme: "light" as SystemTheme,
	});

	const themeIds = Object.keys(themes) as (keyof Themes)[];
	const resolvedSystemThemes = resolveSystemThemes(systemThemes);

	const resolvedTheme = $derived(state.useSystemTheme ? resolvedSystemThemes[state.systemTheme] : state.selectedTheme);

	const setSelectedTheme = (theme: keyof Themes) => {
		return validateRequestedTheme(themeManager, theme).andTee(() => {
			state.selectedTheme = theme;
		});
	};

	const setTheme = (theme: keyof Themes | "system") => {
		if (theme === "system") {
			if (!enableSystemThemes) return err(ThemeManagerError.systemThemesDisabled);

			state.useSystemTheme = true;

			return ok();
		} else {
			state.useSystemTheme = false;
		}

		return setSelectedTheme(theme);
	};

	const hasLightTheme = !!Object.values(themes).find((theme) => theme.type === "light");
	const hasDarkTheme = !!Object.values(themes).find((theme) => theme.type === "dark");

	const hasLightSystemTheme = hasLightTheme && themeIds.includes(resolvedSystemThemes.light);
	const hasDarkSystemTheme = hasDarkTheme && themeIds.includes(resolvedSystemThemes.dark);

	const themeManager: ThemeManager<Themes> = {
		themes,
		themeIds,
		attributes,
		themeClasses,
		enableSystemThemes,
		systemThemes,
		useColorScheme,
		hasLightTheme,
		hasDarkTheme,
		hasLightSystemTheme,
		hasDarkSystemTheme,

		get useSystemTheme() {
			return state.useSystemTheme;
		},
		set useSystemTheme(value) {
			state.useSystemTheme = value;
		},

		get resolvedTheme() {
			return resolvedTheme;
		},

		get selectedTheme() {
			return state.selectedTheme;
		},
		setSelectedTheme,

		setTheme,

		[INTERNAL]: {
			get systemTheme() {
				return state.systemTheme;
			},
			set systemTheme(value) {
				state.systemTheme = value;
			},
		},
	};

	return validateThemeManager(themeManager).map(() => themeManager);
}

function updateColorScheme<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!themeManager.useColorScheme || !browser) return;

	const resolvedTheme = themeManager.themes[themeManager.resolvedTheme];
	if (!resolvedTheme?.color) return;

	document.documentElement.style.colorScheme = resolvedTheme.type;

	let colorSchemeMetaElement = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');

	if (!colorSchemeMetaElement) {
		colorSchemeMetaElement = document.createElement("meta");
		colorSchemeMetaElement.setAttribute("name", "color-scheme");
		document.head.appendChild(colorSchemeMetaElement);
	}

	let content = "light";

	if (themeManager.hasLightTheme && themeManager.hasDarkTheme) content = "light dark";
	else if (themeManager.hasDarkTheme) content = "dark";

	colorSchemeMetaElement.setAttribute("content", content);
}

function updateAttributes<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!browser) return;

	const resolvedTheme = themeManager.resolvedTheme;
	const addedClasses: string[] = [];

	for (const attribute of themeManager.attributes) {
		if (attribute === "class") {
			const themeClasses = themeManager.themeClasses;
			const themeClass =
				themeClasses && resolvedTheme in themeClasses && themeClasses[resolvedTheme]
					? themeClasses[resolvedTheme]
					: resolvedTheme;

			document.documentElement.classList.add(themeClass as string);
			addedClasses.push(themeClass as string);
		} else {
			document.documentElement.setAttribute(attribute, resolvedTheme as string);
		}
	}

	return () => {
		for (const className of addedClasses) {
			document.documentElement.classList.remove(className);
		}
	};
}

function registerMediaListener<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	if (!browser) return;

	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const updateSystemTheme = (matches: boolean) => (themeManager[INTERNAL].systemTheme = matches ? "dark" : "light");

	updateSystemTheme(media.matches);

	media.addEventListener("change", (event) => {
		updateSystemTheme(event.matches);
	});
}

export function registerThemeManager<const Themes extends ThemesRecord>(themeManager: ThemeManager<Themes>) {
	registerMediaListener(themeManager);

	$effect(() => {
		updateColorScheme(themeManager);

		const cleanUpAttributes = updateAttributes(themeManager);

		return () => {
			cleanUpAttributes?.();
		};
	});
}
