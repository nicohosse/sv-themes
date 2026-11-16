import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as themeManagerContextModule from "#lib/contexts/themeManagerContext.svelte.js";
import { createThemes } from "#lib/core/theme/theme.js";
import { createThemeManager } from "#lib/core/themeManager/createThemeManager.svelte.js";
import { THEME_MANAGER_INTERNAL } from "#lib/core/themeManager/index.js";
import { expectOk } from "#lib/tests/setup.js";
import { testEnv } from "#lib/tests/testEnvironment.js";
import { MOCK_THEME_MANAGER_CONFIG } from "#lib/tests/themeManager.js";
import ThemeScope from "../ThemeScope.svelte";
import LocalThemeScopesFixture from "./LocalThemeScopes.fixture.svelte";
import LocalTransparentScopeFixture from "./LocalTransparentScope.fixture.svelte";
import NestedThemeScopesFixture from "./NestedThemeScopes.fixture.svelte";
import ReactiveLocalScopeFixture from "./ReactiveLocalScope.fixture.svelte";

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
				theme: "dark",
				scope: "global",
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
				theme: "light",
				scope: "global",
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
				theme: "light",
				scope: "global",
				priority: 0,
			},
		});

		const second = mount(ThemeScope, {
			target: document.createElement("div"),
			props: {
				theme: "dark",
				scope: "global",
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

	it("registers a global scope with default props if optional parameters are omitted", () => {
		const component = mount(ThemeScope, {
			target: document.body,
			props: {
				scope: "global",
			},
		});

		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.requests).toHaveLength(1);
		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBeUndefined();

		unmount(component);
	});

	it("does not render a wrapper element for a global scope", () => {
		const container = document.createElement("div");

		const component = mount(ThemeScope, {
			target: container,
			props: {
				theme: "dark",
				scope: "global",
			},
		});

		expect(container.firstElementChild).toBeNull();
		expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("dark");

		unmount(component);
	});

	it("renders the meta tag in svelte:head when running on the server", () => {
		testEnv().browser(false).apply();

		const component = mount(ThemeScope, {
			target: document.body,
			props: {
				theme: "dark",
				scope: "global",
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
		expect(container.firstElementChild?.id).toBe("child");

		unmount(component);
	});

	describe("local themes", () => {
		it("applies the theme to a wrapper by default", () => {
			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "dark",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.tagName).toBe("DIV");
			expect(wrapper.dataset.theme).toBe("dark");
			expect(wrapper.classList.contains("dark")).toBe(true);
			expect(wrapper.style.colorScheme).toBe("dark");
			expect(wrapper.style.display).toBe("contents");

			expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
			expect(document.documentElement.className).toBe("");
			expect(themeManager.resolvedTheme).toBe("light");
			expect(themeManager.forcedTheme).toBeUndefined();
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.requests).toHaveLength(0);

			unmount(component);
		});

		it("uses the configured theme class name", () => {
			const themes = createThemes([{ id: "nature", type: "light", className: "theme-nature" }]);
			const customManager = expectOk(
				createThemeManager({
					themes,
					initialTheme: "nature",
					systemThemes: { kind: "disabled" },
				}),
			);

			vi.spyOn(themeManagerContextModule, "getThemeManager").mockImplementation(() => customManager);

			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "nature",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.classList.contains("theme-nature")).toBe(true);
			expect(wrapper.classList.contains("nature")).toBe(false);

			unmount(component);
		});

		it("resolves a local system theme through the manager mappings", async () => {
			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "system",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.dataset.theme).toBe("light");

			await themeManager[THEME_MANAGER_INTERNAL].setSystemTheme("dark");
			flushSync();

			expect(wrapper.dataset.theme).toBe("dark");
			expect(wrapper.style.colorScheme).toBe("dark");

			unmount(component);
		});

		it("updates the wrapper when the theme changes without notifying the manager", () => {
			const container = document.createElement("div");
			const component = mount(ReactiveLocalScopeFixture, { target: container });

			const toggle = container.querySelector<HTMLButtonElement>("#toggle-theme");
			const wrapper = () => container.querySelector<HTMLElement>("[data-theme]");

			expect(wrapper()?.dataset.theme).toBe("dark");
			expect(container.querySelector("#reactive-content")).not.toBeNull();

			const beforeChange = vi.fn();
			const afterChange = vi.fn();
			const select = vi.fn();
			const forced = vi.fn();
			const unforced = vi.fn();
			const systemChange = vi.fn();

			const unsubscribers = [
				themeManager.on("beforeChange", beforeChange),
				themeManager.on("afterChange", afterChange),
				themeManager.on("select", select),
				themeManager.on("forced", forced),
				themeManager.on("unforced", unforced),
				themeManager.on("systemChange", systemChange),
			];

			toggle?.click();
			flushSync();

			expect(wrapper()?.dataset.theme).toBe("light");
			expect(container.querySelector("#reactive-content")).not.toBeNull();

			// A local theme is presentation-only: it must not run the manager's
			// transition pipeline, persistence, or forced-theme registry.
			for (const listener of [beforeChange, afterChange, select, forced, unforced, systemChange])
				expect(listener).not.toHaveBeenCalled();

			expect(themeManager.selectedTheme).toBe("light");
			expect(themeManager.forcedTheme).toBeUndefined();
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.requests).toHaveLength(0);

			for (const unsubscribe of unsubscribers) unsubscribe();
			unmount(component);
		});

		it("falls back to the resolved theme when system themes are disabled", () => {
			const themes = createThemes([
				{ id: "light", type: "light" },
				{ id: "dark", type: "dark" },
			]);
			const customManager = expectOk(
				createThemeManager({
					themes,
					initialTheme: "dark",
					systemThemes: { kind: "disabled" },
				}),
			);

			vi.spyOn(themeManagerContextModule, "getThemeManager").mockImplementation(() => customManager);

			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "system",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.dataset.theme).toBe("dark");

			unmount(component);
		});

		it("omits color-scheme when useColorScheme is disabled", () => {
			const customManager = expectOk(
				createThemeManager({
					...MOCK_THEME_MANAGER_CONFIG,
					useColorScheme: false,
				}),
			);

			vi.spyOn(themeManagerContextModule, "getThemeManager").mockImplementation(() => customManager);

			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "dark",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.dataset.theme).toBe("dark");
			expect(wrapper.style.colorScheme).toBe("");
			expect(wrapper.style.display).toBe("contents");

			unmount(component);
		});

		it("nests local scopes without touching the document theme", () => {
			const component = mount(LocalThemeScopesFixture, {
				target: document.body,
				props: {
					outerTheme: "dark",
					innerTheme: "light",
				},
			});

			const outer = document.body.querySelector<HTMLElement>('[data-theme="dark"]');
			const inner = document.body.querySelector<HTMLElement>('[data-theme="light"]');

			expect(outer).not.toBeNull();
			expect(inner).not.toBeNull();
			expect(outer?.contains(inner ?? null)).toBe(true);
			expect(document.body.querySelector("#inner-content")).not.toBeNull();
			expect(document.documentElement.hasAttribute("data-theme")).toBe(false);

			unmount(component);
		});

		it("keeps local-only scopes out of the global forced theme registry", () => {
			const forcedComponent = mount(ThemeScope, {
				target: document.createElement("div"),
				props: {
					theme: "dark",
					scope: "global",
					priority: 0,
				},
			});

			const localComponent = mount(ThemeScope, {
				target: document.createElement("div"),
				props: {
					theme: "light",
				},
			});

			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("dark");
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.requests).toHaveLength(1);

			unmount(localComponent);
			unmount(forcedComponent);
		});

		it("keeps local scopes transparent to nested global overrides", () => {
			const component = mount(LocalTransparentScopeFixture, {
				target: document.body,
				props: {
					outerTheme: "dark",
					outerOverride: true,
					localTheme: "light",
					innerTheme: "system",
					innerPriority: 100,
				},
			});

			// The local scope does not register a global request, but it must not hide
			// the outer overrideChildren lock from a nested global scope either.
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("dark");

			const localWrapper = document.body.querySelector<HTMLElement>('[data-theme="light"]');

			expect(localWrapper).not.toBeNull();
			expect(localWrapper?.style.display).toBe("contents");

			unmount(component);
		});

		it("supports a custom wrapper element, class, and style", () => {
			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "dark",
					as: "section",
					class: "local-card",
					style: "display: block;",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.tagName).toBe("SECTION");
			expect(wrapper.classList.contains("dark")).toBe(true);
			expect(wrapper.classList.contains("local-card")).toBe(true);
			expect(wrapper.style.display).toBe("block");
			expect(wrapper.style.colorScheme).toBe("dark");

			unmount(component);
		});

		it("ignores an unregistered local theme", () => {
			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "missing" as "light",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper).not.toBeNull();
			expect(wrapper.hasAttribute("data-theme")).toBe(false);
			expect(wrapper.hasAttribute("class")).toBe(false);

			unmount(component);
		});

		it("does not render a forced theme meta tag for local-only scopes on the server", () => {
			testEnv().browser(false).apply();

			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "dark",
				},
			});

			expect(document.head.querySelector('meta[name="sv-themes-force-theme"]')).toBeNull();
			expect((container.firstElementChild as HTMLElement).dataset.theme).toBe("dark");

			unmount(component);
		});
	});
});
