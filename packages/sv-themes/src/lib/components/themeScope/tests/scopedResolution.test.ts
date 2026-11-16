import { flushSync, mount, unmount } from "svelte";
import { describe, expect, it } from "vitest";
import ScopedResolutionFixture from "./ScopedResolution.fixture.svelte";

describe("ThemeScope local resolution", () => {
	function resolvedTheme(id: string) {
		return document.querySelector(`[data-probe="${id}"]`)?.getAttribute("data-resolved-theme");
	}

	it("resolves getThemeManager().resolvedTheme to the nearest local scope", () => {
		const component = mount(ScopedResolutionFixture, { target: document.body });

		expect(resolvedTheme("outside")).toBe("light");
		expect(resolvedTheme("outer")).toBe("forest");
		expect(resolvedTheme("inner")).toBe("light");

		unmount(component);
	});

	it("keeps downstream reads reactive to local theme changes", () => {
		const component = mount(ScopedResolutionFixture, { target: document.body });

		document.querySelector<HTMLButtonElement>("#cycle-local-theme")?.click();
		flushSync();

		expect(resolvedTheme("outside")).toBe("light");
		expect(resolvedTheme("outer")).toBe("dark");
		expect(resolvedTheme("inner")).toBe("light");

		unmount(component);
	});
});
