// v8 ignore file

import { createThemes, DEFAULT_THEMES, type ThemeManagerConfig, type ThemeManagerError } from "$lib/index.js";
import { expectOk } from "./setup.js";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge<T>(base: T, override?: DeepPartial<T>): T {
	if (!override) return base;

	if (Array.isArray(base)) return (override as T) ?? base;

	if (!isRecord(base) || !isRecord(override)) return (override as T) ?? base;

	const result: Record<string, unknown> = { ...base };

	for (const key of Object.keys(override)) {
		const baseValue = base[key];
		const overrideValue = override[key as keyof typeof override];

		if (isRecord(baseValue) && isRecord(overrideValue)) result[key] = deepMerge(baseValue, overrideValue);
		else result[key] = overrideValue;
	}

	return result as T;
}

export const MOCK_THEME_MANAGER_CONFIG: ThemeManagerConfig<typeof DEFAULT_THEMES> = {
	themes: DEFAULT_THEMES,
	initialTheme: "light",
	systemThemes: {
		kind: "enabled",
	},
} as const;

export function createMockThemeManagerConfig(
	overrides?: DeepPartial<ThemeManagerConfig>,
	deepMerging = true,
): ThemeManagerConfig {
	return deepMerging
		? deepMerge(MOCK_THEME_MANAGER_CONFIG, overrides)
		: ({ ...MOCK_THEME_MANAGER_CONFIG, ...overrides } as ThemeManagerConfig);
}

export const INVALID_THEME_MANAGER_CONFIG_CASES: {
	name: string;
	config: ThemeManagerConfig;
	expectedError: ThemeManagerError["id"];
}[] = [
	{
		name: "Initial theme ID not in record",
		config: { themes: DEFAULT_THEMES, initialTheme: "missing" },
		expectedError: "ThemeNotFound",
	},
	{
		name: "System themes enabled but missing 'light' type theme",
		config: {
			themes: expectOk(createThemes([{ id: "dark", type: "dark" }])),
			initialTheme: "dark",
			systemThemes: { kind: "enabled" },
		},
		expectedError: "SystemThemeUnassigned",
	},
	{
		name: "System themes enabled but missing 'dark' type theme",
		config: {
			themes: expectOk(createThemes([{ id: "light", type: "light" }])),
			initialTheme: "light",
			systemThemes: { kind: "enabled" },
		},
		expectedError: "SystemThemeUnassigned",
	},
	{
		name: "Mismatched system mapping (light pref -> dark theme)",
		config: {
			themes: DEFAULT_THEMES,
			initialTheme: "light",
			systemThemes: { kind: "enabled", mappings: { light: "dark" } },
		},
		expectedError: "SystemThemeInvalidType",
	},
	{
		name: "System themes disabled but useSystemTheme is true",
		config: {
			themes: DEFAULT_THEMES,
			initialTheme: "light",
			systemThemes: { kind: "disabled" },
			useSystemTheme: true,
		},
		expectedError: "SystemThemesDisabled",
	},
];
