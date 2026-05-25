import type { Cookies } from "@sveltejs/kit";
import { vi } from "vitest";

export function createMockCookies(initial: Record<string, string> = {}) {
	type CookieOptions = Parameters<Cookies["set"]>[2];

	const store = new Map<string, { value: string; options?: CookieOptions }>(
		Object.entries(initial).map(([key, value]) => [key, { value }]),
	);

	return {
		get: vi.fn((name: string) => store.get(name)?.value),

		getAll: vi.fn(() =>
			Array.from(store.entries()).map(([name, data]) => ({
				name,
				value: data.value,
			})),
		),

		set: vi.fn((name: string, value: string, options?: CookieOptions) => store.set(name, { value, options })),

		delete: vi.fn((name: string) => store.delete(name)),

		serialize: vi.fn((name: string, value: string, options?: CookieOptions) => {
			store.set(name, { value, options });
			return `${name}=${encodeURIComponent(value)}`;
		}),
	};
}
