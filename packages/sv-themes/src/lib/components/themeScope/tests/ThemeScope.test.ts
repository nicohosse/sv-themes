import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as themeManagerContextModule from "#lib/contexts/themeManagerContext.svelte.js";
import { createThemeManager } from "#lib/core/themeManager/createThemeManager.svelte.js";
import { THEME_MANAGER_INTERNAL } from "#lib/core/themeManager/index.js";
import { expectOk } from "#lib/tests/setup.js";
import { testEnv } from "#lib/tests/testEnvironment.js";
import { MOCK_THEME_MANAGER_CONFIG } from "#lib/tests/themeManager.js";
import ThemeScope from "../ThemeScope.svelte";
import NestedThemeScopesFixture from "./NestedThemeScopes.fixture.svelte";

describe("ThemeScope", () => {
	let themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

	beforeEach(() => {
		themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockImplementation(() => themeManager);
	});

	it("registers the theme and updates dominantForcedTheme", () => {
		const component = mount(ThemeScope, {
			target: document.body,
			props: {
				forcedTheme: "dark",
				priority: 0,
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("dark");

		unmount(component);
	});

	it("unregisters itself from the registry upon destruction", () => {
		const component = mount(ThemeScope, {
			target: document.body,
			props: {
				forcedTheme: "light",
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("light");

		unmount(component);

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBeUndefined();
	});

	it("blocks child themes when ancestor has overrideChildren enabled", () => {
		const component = mount(NestedThemeScopesFixture, {
			target: document.body,
			props: {
				parentTheme: "light",
				parentOverride: true,
				parentPriority: 0,
				childTheme: "dark",
				childPriority: 1,
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("light");

		unmount(component);
	});

	it("allows child themes to override when ancestor has overrideChildren disabled", () => {
		const component = mount(NestedThemeScopesFixture, {
			target: document.body,
			props: {
				parentTheme: "light",
				parentOverride: false,
				parentPriority: 0,
				childTheme: "dark",
				childPriority: 1,
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("dark");

		unmount(component);
	});

	it("blocks grandchildren when an ancestor has overrideChildren enabled", () => {
		const component = mount(NestedThemeScopesFixture, {
			target: document.body,
			props: {
				parentTheme: "light",
				parentOverride: true,
				parentPriority: 0,
				childTheme: "dark",
				childPriority: 1,
				childOverride: false,
				grandchildTheme: "system",
				grandchildPriority: 100,
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("light");

		unmount(component);
	});

	it("allows a grandchild to win when no ancestor has overrideChildren enabled", () => {
		const component = mount(NestedThemeScopesFixture, {
			target: document.body,
			props: {
				parentTheme: "light",
				parentOverride: false,
				parentPriority: 0,
				childTheme: "dark",
				childPriority: 1,
				childOverride: false,
				grandchildTheme: "system",
				grandchildPriority: 100,
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("system");

		unmount(component);
	});

	it("restores an earlier sibling scope when the later one unmounts", () => {
		const first = mount(ThemeScope, {
			target: document.createElement("div"),
			props: {
				forcedTheme: "light",
				priority: 0,
			},
		});

		const second = mount(ThemeScope, {
			target: document.createElement("div"),
			props: {
				forcedTheme: "dark",
				priority: 1,
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("dark");

		flushSync();

		unmount(second);

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("light");

		unmount(first);

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBeUndefined();
	});

	it("registers with default props if optional parameters are omitted", () => {
		const component = mount(ThemeScope, {
			target: document.body,
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBeUndefined();

		unmount(component);
	});

	it("renders the meta tag in svelte:head when running on the server", () => {
		testEnv().browser(false).apply();

		const component = mount(ThemeScope, {
			target: document.body,
			props: {
				forcedTheme: "dark",
				priority: 0,
				overrideChildren: true,
			},
		});

		const meta = document.head.querySelector<HTMLMetaElement>('meta[name="sv-themes-force-theme"]');

		expect(meta).not.toBeNull();
		expect(JSON.parse(decodeURIComponent(meta?.content ?? ""))).toEqual({
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: true,
			depth: 0,
		});

		unmount(component);
	});

	it("renders children when provided", () => {
		const mockSnippet = createRawSnippet(() => ({
			render: () => '<span id="child">Test Snippet</span>',
		}));

		const container = document.createElement("div");
		const component = mount(ThemeScope, {
			target: container,
			props: {
				children: mockSnippet,
			},
		});

		const childElement = container.querySelector("#child");

		expect(childElement).not.toBeNull();
		expect(childElement?.textContent).toBe("Test Snippet");

		unmount(component);
	});
});
