import { createRawSnippet, mount, unmount } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as themeManagerContextModule from "$lib/contexts/theme-manager-context.svelte.js";
import { createThemeManager } from "$lib/core/theme-manager/create-theme-manager.svelte.js";
import { THEME_MANAGER_INTERNAL } from "$lib/core/theme-manager/index.js";
import { expectOk } from "$lib/tests/setup.js";
import { testEnv } from "$lib/tests/test-environment.js";
import { MOCK_THEME_MANAGER_CONFIG } from "$lib/tests/theme-manager.js";
import ForceTheme from "../ForceTheme.svelte";
import NestedForceThemesFixture from "./NestedForceThemes.fixture.svelte";

describe("ForceTheme", () => {
	let themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

	beforeEach(() => {
		themeManager = expectOk(createThemeManager(MOCK_THEME_MANAGER_CONFIG));

		vi.spyOn(themeManagerContextModule, "getThemeManager").mockImplementation(() => themeManager);
	});

	it("registers the theme and updates dominantForcedTheme", () => {
		const component = mount(ForceTheme, {
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
		const component = mount(ForceTheme, {
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
		const component = mount(NestedForceThemesFixture, {
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
		const component = mount(NestedForceThemesFixture, {
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

	it("registers with default props if optional parameters are omitted", () => {
		const component = mount(ForceTheme, {
			target: document.body,
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBeUndefined();

		unmount(component);
	});

	it("renders the meta tag in svelte:head when running on the server", () => {
		testEnv().browser(false).apply();

		const component = mount(ForceTheme, {
			target: document.body,
			props: {
				forcedTheme: "dark",
				priority: 0,
				overrideChildren: true,
			},
		});

		expect(document.head.innerHTML).toContain(
			'<meta name="sv-themes-force-theme" content="forcedTheme=dark;priority=0;overrideChildren=true">',
		);

		unmount(component);
	});

	it("renders children when provided", () => {
		const mockSnippet = createRawSnippet(() => ({
			render: () => '<span id="child">Test Snippet</span>',
		}));

		const container = document.createElement("div");
		const component = mount(ForceTheme, {
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
