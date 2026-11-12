import { flushSync } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createForceThemeRegistry,
	type ForceThemeRegistry,
	type ForceThemeRequest,
	isBlockedByAncestor,
} from "$lib/core/theme-manager/force-theme-registry.svelte.js";

describe("isBlockedByAncestor", () => {
	it("returns false if there is no parent ID", () => {
		const request: ForceThemeRequest = {
			id: Symbol(),
			priority: 0,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const requestMap = new Map<symbol, ForceThemeRequest>([[request.id, request]]);

		const result = isBlockedByAncestor(request, requestMap);

		expect(result).toBe(false);
	});

	it("returns false if parent is not registered", () => {
		const parentId = Symbol();

		const request: ForceThemeRequest = {
			id: Symbol(),
			parentId,
			priority: 0,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const requestMap = new Map<symbol, ForceThemeRequest>([[request.id, request]]);

		const result = isBlockedByAncestor(request, requestMap);

		expect(result).toBe(false);
	});

	it("returns true if parent overrides children", () => {
		const parentId = Symbol();
		const id = Symbol();

		const parentRequest: ForceThemeRequest = {
			id: parentId,
			priority: 0,
			overrideChildren: true,
			timestamp: Date.now(),
		};

		const request: ForceThemeRequest = {
			id,
			parentId,
			priority: 1,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const requestMap = new Map<symbol, ForceThemeRequest>([
			[parentId, parentRequest],
			[id, request],
		]);

		const result = isBlockedByAncestor(request, requestMap);

		expect(result).toBe(true);
	});

	it("returns true if grandparent overrides children", () => {
		const grandparentId = Symbol();
		const parentId = Symbol();
		const id = Symbol();

		const grandparentRequest: ForceThemeRequest = {
			id: grandparentId,
			priority: 0,
			overrideChildren: true,
			timestamp: Date.now(),
		};

		const parentRequest: ForceThemeRequest = {
			id: parentId,
			parentId: grandparentId,
			priority: 0,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const request: ForceThemeRequest = {
			id,
			parentId,
			priority: 1,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const requestMap = new Map<symbol, ForceThemeRequest>([
			[grandparentId, grandparentRequest],
			[parentId, parentRequest],
			[id, request],
		]);

		const result = isBlockedByAncestor(request, requestMap);

		expect(result).toBe(true);
	});

	it("returns false if no ancestor overrides children", () => {
		const grandparentId = Symbol();
		const parentId = Symbol();
		const id = Symbol();

		const grandparentRequest: ForceThemeRequest = {
			id: grandparentId,
			priority: 0,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const parentRequest: ForceThemeRequest = {
			id: parentId,
			parentId: grandparentId,
			priority: 1,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const request: ForceThemeRequest = {
			id,
			parentId,
			priority: 2,
			overrideChildren: false,
			timestamp: Date.now(),
		};

		const requestMap = new Map<symbol, ForceThemeRequest>([
			[grandparentId, grandparentRequest],
			[parentId, parentRequest],
			[id, request],
		]);

		const result = isBlockedByAncestor(request, requestMap);

		expect(result).toBe(false);
	});
});

describe("dominantForcedTheme", () => {
	let forceThemeRegistry: ForceThemeRegistry;

	beforeEach(() => {
		forceThemeRegistry = createForceThemeRegistry();
	});

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

	it("treats undefined forced themes as valid requests", () => {
		const id1 = Symbol();
		const id2 = Symbol();

		forceThemeRegistry.register({
			id: id1,
			forcedTheme: undefined,
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		forceThemeRegistry.register({
			id: id2,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBeUndefined();

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
	let forceThemeRegistry: ForceThemeRegistry;

	beforeEach(() => {
		forceThemeRegistry = createForceThemeRegistry();
	});

	it("pushes a new request when ID does not exist", () => {
		const id = Symbol();

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

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

		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			forcedTheme: "dark",
		});

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id,
			forcedTheme: "light",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			forcedTheme: "light",
		});

		forceThemeRegistry.unregister(id);
	});

	it("updates when priority changes", () => {
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

		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			priority: 0,
		});

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 1,
			overrideChildren: false,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			priority: 1,
		});

		forceThemeRegistry.unregister(id);
	});

	it("updates when parentId changes", () => {
		const spy = vi.spyOn(Date, "now");
		spy.mockReturnValue(1000);

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

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			parentId: parent1,
		});

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id,
			parentId: parent2,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			parentId: parent2,
		});

		forceThemeRegistry.unregister(id);
	});

	it("updates when overrideChildren changes", () => {
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

		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			overrideChildren: false,
		});

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id,
			forcedTheme: "dark",
			priority: 0,
			overrideChildren: true,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id,
			overrideChildren: true,
		});

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

		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id: idA,
			forcedTheme: "themeA",
		});

		spy.mockReturnValue(2000);

		forceThemeRegistry.register({
			id: idA,
			forcedTheme: "themeA",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(1);
		expect(forceThemeRegistry.requests[0]).toMatchObject({
			id: idA,
			forcedTheme: "themeA",
		});

		spy.mockReturnValue(1500);

		const idB = Symbol();

		forceThemeRegistry.register({
			id: idB,
			forcedTheme: "themeB",
			priority: 0,
			overrideChildren: false,
		});

		flushSync();

		expect(forceThemeRegistry.requests.length).toBe(2);
		expect(forceThemeRegistry.requests[1]).toMatchObject({
			id: idB,
			forcedTheme: "themeB",
		});

		const result = forceThemeRegistry.dominantForcedTheme;

		expect(result).toBe("themeB");

		forceThemeRegistry.unregister(idA);
		forceThemeRegistry.unregister(idB);
	});
});

describe("unregister", () => {
	let forceThemeRegistry: ForceThemeRegistry;

	beforeEach(() => {
		forceThemeRegistry = createForceThemeRegistry();
	});

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
