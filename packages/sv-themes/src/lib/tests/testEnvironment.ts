import { vi } from "vitest";

export type CookieStoreMock = {
	set: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
};

type BuiltEnv<TCookieStore extends boolean> = TCookieStore extends true
	? { browser: boolean; cookieStore: CookieStoreMock; systemTheme: "light" | "dark" | undefined }
	: { browser: boolean; cookieStore: undefined; systemTheme: "light" | "dark" | undefined };

type Builder<TCookieStore extends boolean = true> = {
	browser(value: boolean): Builder<TCookieStore>;
	cookieStore(value?: boolean): Builder<TCookieStore>;
	systemTheme(value: "light" | "dark"): Builder<TCookieStore>;
	apply(): BuiltEnv<TCookieStore>;
};

function createCookieStore(): CookieStoreMock {
	return {
		set: vi.fn(),
		get: vi.fn(),
	};
}

const state = {
	browser: true,
	cookieStore: undefined as CookieStoreMock | undefined,
	systemTheme: "light" as "light" | "dark" | undefined,
};

vi.mock("esm-env", () => ({
	get BROWSER() {
		return state.browser;
	},
	DEV: true,
}));

vi.stubGlobal("matchMedia", (query: string) => ({
	matches: query === "(prefers-color-scheme: dark)" ? state.systemTheme === "dark" : false,
	media: query,
	onchange: null,
	addListener: vi.fn(),
	removeListener: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
}));

Object.defineProperty(globalThis, "cookieStore", {
	get() {
		return state.cookieStore;
	},
	configurable: true,
});

export function testEnv(): Builder<true> {
	let browser = state.browser;
	let cookieStoreEnabled = !!state.cookieStore;
	let systemTheme = state.systemTheme;

	const builder: Builder<boolean> = {
		browser(value: boolean) {
			browser = value;
			return builder;
		},

		cookieStore(value = true) {
			cookieStoreEnabled = value;
			return builder;
		},

		systemTheme(value: "light" | "dark") {
			systemTheme = value;
			return builder;
		},

		apply() {
			state.browser = browser;
			state.cookieStore = cookieStoreEnabled ? createCookieStore() : undefined;
			state.systemTheme = systemTheme;

			return {
				browser,
				cookieStore: state.cookieStore,
				systemTheme,
			} as BuiltEnv<typeof cookieStoreEnabled>;
		},
	};

	return builder;
}

export function resetTestEnv() {
	state.browser = true;
	state.cookieStore = undefined;
	state.systemTheme = "light";
}
