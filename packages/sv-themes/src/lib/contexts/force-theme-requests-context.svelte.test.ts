import { flushSync } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createForceThemeRegistry, type ForceThemeRegistry } from "./force-theme-requests-context.svelte.js";

let forceThemeRegistry: ForceThemeRegistry;

beforeEach(() => {
	forceThemeRegistry = createForceThemeRegistry();
});

describe("isBlockedByAncestor", () => {
	it("returns false if there is no parent ID", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("dark");

		forceThemeRegistry.unregister(id);
	});

	it("returns false if parent is not registered", () => {
		const parentId = Symbol();
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			parentId,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("dark");

		forceThemeRegistry.unregister(id);
	});

	it("returns true if parent overrides children", () => {
		const parentId = Symbol();
		const id = Symbol();

		forceThemeRegistry.register({
			id: parentId,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: true,
		});

		flushSync();

		forceThemeRegistry.register({
			id,
			parentId,
			forcedTheme: "dark",
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("light");

		forceThemeRegistry.unregister(parentId);
		forceThemeRegistry.unregister(id);
	});

	it("returns true if grandparent overrides children", () => {
		const grandparentId = Symbol();
		const parentId = Symbol();
		const id = Symbol();

		forceThemeRegistry.register({
			id: grandparentId,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: true,
		});

		flushSync();

		forceThemeRegistry.register({
			id: parentId,
			parentId: grandparentId,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id,
			parentId,
			forcedTheme: "custom",
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("light");

		forceThemeRegistry.unregister(grandparentId);
		forceThemeRegistry.unregister(parentId);
		forceThemeRegistry.unregister(id);
	});

	it("returns false if no ancestor overrides children", () => {
		const grandparentId = Symbol();
		const parentId = Symbol();
		const id = Symbol();

		forceThemeRegistry.register({
			id: grandparentId,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id: parentId,
			parentId: grandparentId,
			forcedTheme: "dark",
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id,
			parentId,
			forcedTheme: "custom",
			priority: 2,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("custom");

		forceThemeRegistry.unregister(grandparentId);
		forceThemeRegistry.unregister(parentId);
		forceThemeRegistry.unregister(id);
	});
});

describe("dominantForcedTheme", () => {
	it("returns undefined when requests array is empty", () => {
		expect(forceThemeRegistry.dominantForcedTheme).toBeUndefined();
	});

	it("returns undefined when there are no valid requests with themes", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBeUndefined();

		forceThemeRegistry.unregister(id);
	});

	it("sorts requests by priority in descending order", () => {
		const id1 = Symbol();
		const id2 = Symbol();

		forceThemeRegistry.register({
			id: id1,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id: id2,
			forcedTheme: "light",
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("light");

		forceThemeRegistry.unregister(id1);
		forceThemeRegistry.unregister(id2);
	});

	it("sorts requests by timestamp in descending order when priorities are equal", () => {
		const spy = vi.spyOn(Date, "now");
		spy.mockReturnValue(1000);

		const id1 = Symbol();

		forceThemeRegistry.register({
			id: id1,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		spy.mockReturnValue(2000);

		const id2 = Symbol();

		forceThemeRegistry.register({
			id: id2,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("light");

		forceThemeRegistry.unregister(id1);
		forceThemeRegistry.unregister(id2);
	});

	it("keeps the older registered item when a newer registered item has a lower timestamp but is registered first", () => {
		const spy = vi.spyOn(Date, "now");
		spy.mockReturnValue(2000);
		const id1 = Symbol();

		forceThemeRegistry.register({
			id: id1,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		spy.mockReturnValue(1000);

		const id2 = Symbol();

		forceThemeRegistry.register({
			id: id2,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("dark");

		forceThemeRegistry.unregister(id1);
		forceThemeRegistry.unregister(id2);
	});
});

describe("register", () => {
	it("pushes a new request when ID does not exist", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("dark");

		forceThemeRegistry.unregister(id);
	});

	it("updates when forcedTheme changes", () => {
		const spy = vi.spyOn(Date, "now");
		spy.mockReturnValue(1000);

		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("light");

		forceThemeRegistry.unregister(id);
	});

	it("updates when priority changes", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("dark");

		forceThemeRegistry.unregister(id);
	});

	it("updates when parentId changes", () => {
		const parent1 = Symbol();
		const parent2 = Symbol();
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			parentId: parent1,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id,
			parentId: parent2,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.unregister(id);
	});

	it("updates when overrideChildren changes", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: true,
		});

		flushSync();

		forceThemeRegistry.unregister(id);
	});

	it("ignores update if all fields are identical", () => {
		const spy = vi.spyOn(Date, "now");
		spy.mockReturnValue(1000);

		const idA = Symbol();

		forceThemeRegistry.register({
			id: idA,
			forcedTheme: "themeA",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id: idA,
			forcedTheme: "themeA",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		spy.mockReturnValue(1500);

		const idB = Symbol();

		forceThemeRegistry.register({
			id: idB,
			forcedTheme: "themeB",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("themeB");

		forceThemeRegistry.unregister(idA);
		forceThemeRegistry.unregister(idB);
	});
});

describe("unregister", () => {
	it("removes a request by its symbol ID", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const initialResult = forceThemeRegistry.dominantForcedTheme;
		expect(initialResult).toBe("dark");

		forceThemeRegistry.unregister(id);

		const finalResult = forceThemeRegistry.dominantForcedTheme;
		expect(finalResult).toBeUndefined();
	});
});
