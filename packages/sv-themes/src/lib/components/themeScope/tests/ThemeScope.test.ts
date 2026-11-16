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
import MutableLocalScopeFixture from "./MutableLocalScope.fixture.svelte";
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
				mode: "global",
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
				mode: "global",
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
				mode: "global",
				priority: 0,
			},
		});

		const second = mount(ThemeScope, {
			target: document.createElement("div"),
			props: {
				theme: "dark",
				mode: "global",
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
				mode: "global",
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
				mode: "global",
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
				mode: "global",
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
		function runBootScript(container: HTMLElement) {
			const script = container.querySelector<HTMLScriptElement>("script[data-sv-themes-boot]");

			expect(script).not.toBeNull();

			vi.spyOn(document, "currentScript", "get").mockReturnValue(script);

			new Function(script?.textContent ?? "")();
		}

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

		it("bootstraps a server-rendered local system scope before hydration", () => {
			testEnv().browser(false).systemTheme("light").apply();

			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "system",
				},
			});

			const wrapper = container.querySelector<HTMLElement>("[data-theme]");
			const script = container.querySelector<HTMLScriptElement>("script[data-sv-themes-boot]");

			expect(wrapper?.dataset.theme).toBe("light");
			expect(script).not.toBeNull();
			expect(JSON.parse(script?.dataset.svThemesBoot ?? "null")).toEqual({
				a: ["class", "data-theme"],
				l: { id: "light", c: "light", t: "light" },
				d: { id: "dark", c: "dark", t: "dark" },
				ac: ["light", "dark"],
				cs: true,
			});

			// The server fallback was light; the client prefers dark, and the boot
			// script must fix the wrapper before hydration.
			testEnv().systemTheme("dark").apply();

			runBootScript(container);

			expect(wrapper?.dataset.theme).toBe("dark");
			expect(wrapper?.classList.contains("dark")).toBe(true);
			expect(wrapper?.classList.contains("light")).toBe(false);
			expect(wrapper?.style.colorScheme).toBe("dark");

			unmount(component);
		});

		it("bootstraps custom attributes and mappings without color-scheme", () => {
			testEnv().browser(false).systemTheme("light").apply();

			const themes = createThemes([
				{ id: "day", type: "light", className: "theme-day" },
				{ id: "night", type: "dark", className: "theme-night" },
			]);
			const customManager = expectOk(
				createThemeManager({
					themes,
					initialTheme: "day",
					systemThemes: { kind: "enabled", mappings: { light: "day", dark: "night" } },
					attributes: ["class", "data-theme", "data-palette"],
					useColorScheme: false,
					enableLogging: false,
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

			const wrapper = container.querySelector<HTMLElement>("[data-theme]") as HTMLElement;

			expect(wrapper.dataset.theme).toBe("day");
			expect(wrapper.dataset.palette).toBe("day");
			expect(wrapper.classList.contains("theme-day")).toBe(true);
			expect(wrapper.style.colorScheme).toBe("");

			testEnv().systemTheme("dark").apply();

			runBootScript(container);

			expect(wrapper.dataset.theme).toBe("night");
			expect(wrapper.dataset.palette).toBe("night");
			expect(wrapper.classList.contains("theme-night")).toBe(true);
			expect(wrapper.classList.contains("theme-day")).toBe(false);
			expect(wrapper.style.colorScheme).toBe("");

			unmount(component);
		});

		it("adds the CSP nonce to the local boot script", () => {
			testEnv().browser(false).apply();

			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "system",
					cspNonce: "test-nonce",
				},
			});

			const script = container.querySelector<HTMLScriptElement>("script[data-sv-themes-boot]");

			expect(script?.getAttribute("nonce")).toBe("test-nonce");
			expect(container.firstElementChild?.hasAttribute("nonce")).toBe(false);

			unmount(component);
		});

		it("does not render a boot script for concrete themes or global scopes", () => {
			const localContainer = document.createElement("div");
			const local = mount(ThemeScope, { target: localContainer, props: { theme: "dark" } });

			expect(localContainer.querySelector("script[data-sv-themes-boot]")).toBeNull();

			unmount(local);

			testEnv().browser(false).apply();

			const globalContainer = document.createElement("div");
			const globalScope = mount(ThemeScope, {
				target: globalContainer,
				props: { theme: "system", mode: "global" },
			});

			expect(globalContainer.querySelector("script[data-sv-themes-boot]")).toBeNull();

			unmount(globalScope);
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

		it("follows the resolved theme when system themes are disabled", async () => {
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

			await customManager.setTheme("light");
			flushSync();

			expect(wrapper.dataset.theme).toBe("light");

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
					mode: "global",
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

		it("lets a global scope nested inside a local scope win when nothing blocks it", () => {
			const component = mount(LocalTransparentScopeFixture, {
				target: document.body,
				props: {
					outerTheme: "dark",
					outerOverride: false,
					localTheme: "light",
					innerTheme: "system",
					innerPriority: 100,
				},
			});

			// Local scopes are transparent to the forced-theme tree, so the inner
			// global request attaches to the outer global scope and competes normally.
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.dominantForcedTheme).toBe("system");

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

		it("removes the theme attributes when a valid local theme becomes invalid", () => {
			const container = document.createElement("div");
			const component = mount(MutableLocalScopeFixture, { target: container });

			const wrapper = container.querySelector<HTMLElement>("[data-theme]");

			expect(wrapper?.dataset.theme).toBe("dark");
			expect(wrapper?.classList.contains("dark")).toBe(true);

			container.querySelector<HTMLButtonElement>("#set-invalid-theme")?.click();
			flushSync();

			expect(wrapper?.hasAttribute("data-theme")).toBe(false);
			expect(wrapper?.hasAttribute("class")).toBe(false);
			expect(wrapper?.style.colorScheme).toBe("");
			expect(container.querySelector("#mutable-content")).not.toBeNull();

			unmount(component);
		});

		it("forwards extra attributes to the local wrapper", () => {
			const container = document.createElement("div");

			const component = mount(ThemeScope, {
				target: container,
				props: {
					theme: "dark",
					id: "brand",
					"aria-label": "Branded section",
				},
			});

			const wrapper = container.firstElementChild as HTMLElement;

			expect(wrapper.id).toBe("brand");
			expect(wrapper.getAttribute("aria-label")).toBe("Branded section");
			expect(wrapper.dataset.theme).toBe("dark");
			expect(wrapper.style.display).toBe("contents");

			unmount(component);
		});

		it("warns and ignores global-only props on a local scope", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const component = mount(ThemeScope, {
				target: document.createElement("div"),
				props: {
					theme: "dark",
					priority: 5,
					overrideChildren: true,
				},
			});

			expect(warnSpy).toHaveBeenCalledWith(
				'ThemeScope: `priority` and `overrideChildren` only apply to `mode="global"`; they are ignored here.',
			);
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.requests).toHaveLength(0);

			warnSpy.mockRestore();
			unmount(component);
		});

		it("warns when mode changes at runtime and keeps the mounted behavior", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const container = document.createElement("div");
			const component = mount(MutableLocalScopeFixture, { target: container });

			const wrapper = () => container.querySelector<HTMLElement>("[data-theme]");

			expect(wrapper()?.dataset.theme).toBe("dark");

			container.querySelector<HTMLButtonElement>("#set-global-mode")?.click();
			flushSync();

			expect(warnSpy).toHaveBeenCalledOnce();
			expect(warnSpy).toHaveBeenCalledWith(
				"ThemeScope: `mode` is read when the scope mounts. Remount the component to change it.",
			);

			// `mode` is structural, so the mounted scope keeps its original behavior.
			expect(wrapper()?.dataset.theme).toBe("dark");
			expect(themeManager[THEME_MANAGER_INTERNAL].forceThemeRegistry.requests).toHaveLength(0);

			warnSpy.mockRestore();
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
