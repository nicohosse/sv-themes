import { flushSync, mount, unmount } from "svelte";
import { describe, expect, it, vi } from "vitest";
import ScopedResolutionFixture from "./ScopedResolution.fixture.svelte";

describe("ThemeScope local resolution", () => {
	function probe(id: string, attribute: "resolved" | "resolved-use-system" | "selected" | "forced" = "resolved") {
		return document.querySelector(`[data-probe="${id}"]`)?.getAttribute(`data-${attribute}-theme`);
	}

	it("resolves getThemeManager().resolvedTheme to the nearest local scope", () => {
		const component = mount(ScopedResolutionFixture, { target: document.body });

		expect(probe("outside")).toBe("light");
		expect(probe("transparent-outside")).toBe("light");
		expect(probe("outer")).toBe("forest");
		expect(probe("transparent-inner")).toBe("forest");
		expect(probe("system")).toBe("light");
		expect(probe("inner")).toBe("light");

		unmount(component);
	});

	it("scopes resolvedUseSystemTheme to the local scope", () => {
		const component = mount(ScopedResolutionFixture, { target: document.body });

		// The manager itself does not use the system theme, but a local
		// `theme="system"` scope does, and its descendants must see that.
		expect(probe("outside", "resolved-use-system")).toBe("false");
		expect(probe("outer", "resolved-use-system")).toBe("false");
		expect(probe("system", "resolved-use-system")).toBe("true");
		expect(probe("inner", "resolved-use-system")).toBe("false");

		unmount(component);
	});

	it("keeps downstream reads reactive to local theme changes", () => {
		const component = mount(ScopedResolutionFixture, { target: document.body });

		document.querySelector<HTMLButtonElement>("#cycle-local-theme")?.click();
		flushSync();

		expect(probe("outside")).toBe("light");
		expect(probe("outer")).toBe("dark");
		expect(probe("transparent-inner")).toBe("dark");
		expect(probe("inner")).toBe("light");

		unmount(component);
	});

	it("leaves global manager state and methods untouched inside a local scope", async () => {
		const component = mount(ScopedResolutionFixture, { target: document.body });

		expect(probe("outer", "selected")).toBe("light");
		expect(probe("outer", "forced")).toBe("none");

		document.querySelector<HTMLButtonElement>("#set-global-dark")?.click();

		// The button lives inside the local scope, so this goes through the scoped
		// manager view. Only `resolvedTheme` is scoped; `setTheme` still acts globally.
		await vi.waitFor(() => expect(probe("outside")).toBe("dark"));

		expect(probe("outer")).toBe("forest");
		expect(probe("transparent-inner")).toBe("forest");
		expect(probe("inner")).toBe("light");

		for (const id of ["outside", "outer", "transparent-inner", "inner"]) expect(probe(id, "selected")).toBe("dark");

		unmount(component);
	});
});
