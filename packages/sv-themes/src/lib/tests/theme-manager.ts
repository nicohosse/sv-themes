import { createThemes, DEFAULT_THEMES, type ThemeManagerConfig, type ThemeManagerError } from "$lib/index.js";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override?: unknown): T {
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
	overrides?: Partial<ThemeManagerConfig>,
	deepMerging = true,
): ThemeManagerConfig {
	const base = MOCK_THEME_MANAGER_CONFIG;
	return deepMerging ? deepMerge(base, overrides) : { ...base, ...overrides };
}

export const INVALID_THEME_MANAGER_CONFIG_CASES: {
	name: string;
	config: ThemeManagerConfig;
	expectedError: ThemeManagerError["id"] | Partial<ThemeManagerError>;
}[] = [
	{
		name: "Initial theme ID not in record",
		config: createMockThemeManagerConfig({ initialTheme: "missing" }),
		expectedError: "ThemeNotFound",
	},
	{
		name: "System themes enabled but missing 'light' type theme",
		config: createMockThemeManagerConfig(
			{
				themes: createThemes([{ id: "dark", type: "dark" }]),
			},
			false,
		),
		expectedError: "SystemThemeUnassigned",
	},
	{
		name: "System themes enabled but missing 'dark' type theme",
		config: createMockThemeManagerConfig(
			{
				themes: createThemes([{ id: "light", type: "light" }]),
			},
			false,
		),
		expectedError: "SystemThemeUnassigned",
	},
	{
		name: "Mismatched system mapping (light pref -> dark theme)",
		config: createMockThemeManagerConfig(
			{
				systemThemes: { kind: "enabled", mappings: { light: "dark" } },
			},
			false,
		),
		expectedError: "SystemThemeInvalidType",
	},
	{
		name: "System themes disabled but useSystemTheme is true",
		config: createMockThemeManagerConfig(
			{
				systemThemes: { kind: "disabled" },
				useSystemTheme: true,
			},
			false,
		),
		expectedError: "SystemThemesDisabled",
	},
	{
		name: "Multiple themes use the same ID",
		config: createMockThemeManagerConfig(
			{
				themes: {
					dark: { id: "dark", type: "dark" },
					anotherDark: { id: "dark", type: "dark" },
				},
				systemThemes: { kind: "disabled" },
			},
			false,
		),
		expectedError: "DuplicateTheme",
	},
	{
		name: "Tab sync enabled but no compatible storage method used",
		config: createMockThemeManagerConfig(
			{
				storage: {
					methods: ["cookie"],
					key: "theme",
					cookie: { name: "theme" },
				},
				enableTabSync: true,
			},
			false,
		),
		expectedError: "TabSyncStorageMethodsIncompatible",
	},
];
