import "@testing-library/jest-dom/vitest";
import { format } from "@vitest/pretty-format";
import type { Result } from "neverthrow";
import { afterEach, expect, vi } from "vitest";
import type { LibError } from "$lib/index.js";
import { StorageMock } from "./storage.js";
import { resetTestEnv } from "./test-environment.js";

export function expectOk<T, E>(result: Result<T, E>): T {
	expect(result).toBeOk();

	return result._unsafeUnwrap();
}

function isNeverthrowResult(value: unknown): value is Result<unknown, LibError> {
	return (
		typeof value === "object" &&
		value !== null &&
		"isOk" in value &&
		typeof value.isOk === "function" &&
		"isErr" in value &&
		typeof value.isErr === "function"
	);
}

function normalizeErrors<E>(error: E): E[] {
	return Array.isArray(error) ? error : [error];
}

function formatErrors(error: LibError): string {
	const errors = normalizeErrors(error);
	return ["Errors:", format(errors), "Messages:", ...errors.map((error) => `- ${error.message}`)].join("\n");
}

type ExpectedError = LibError["id"] | Partial<LibError>;

function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;

	if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	const objA = a as Record<string, unknown>;
	const objB = b as Record<string, unknown>;

	return keysA.every((key) => deepEqual(objA[key], objB[key]));
}

expect.extend({
	toBeOk(received: Result<unknown, LibError>) {
		if (!isNeverthrowResult(received))
			return {
				pass: false,
				message: () => `expected a neverthrow Result, got ${format(received)}`,
			};

		if (received.isOk())
			return {
				pass: true,
				message: () => "expected Result to be Err, but it was Ok",
			};

		return {
			pass: false,
			message: () => ["expected Result to be Ok, but it was Err", formatErrors(received.error)].join("\n"),
		};
	},

	toBeErr(received: Result<unknown, LibError>, expectedErrors?: ExpectedError | ExpectedError[], strict = false) {
		if (!isNeverthrowResult(received))
			return {
				pass: false,
				message: () => `expected a neverthrow Result, got ${format(received)}`,
			};

		if (received.isOk())
			return {
				pass: false,
				message: () => ["expected Result to be Err, but it was Ok", "", "Value:", format(received.value)].join("\n"),
			};

		const errors = normalizeErrors(received.error);

		if (expectedErrors !== undefined) {
			const expected = Array.isArray(expectedErrors) ? expectedErrors : [expectedErrors];

			const matches = (received: LibError, expected: ExpectedError): boolean => {
				if (expected && typeof expected === "object") return deepEqual(received, expected);
				return received.id === expected;
			};

			const formatExpectedValue = (val: ExpectedError): string =>
				typeof val === "object" && val !== null ? format(val) : String(val);

			const missing = expected.filter((exp) => !errors.some((rec) => matches(rec, exp)));

			if (missing.length > 0)
				return {
					pass: false,
					message: () =>
						[
							`expected Result to contain error(s): [${expected.map(formatExpectedValue).join(", ")}]`,
							`missing error(s): [${missing.map(formatExpectedValue).join(", ")}]`,
							`received errors:`,
							formatErrors(received.error),
						].join("\n"),
				};

			if (strict) {
				const unexpected = errors.filter((rec) => !expected.some((exp) => matches(rec, exp)));

				if (unexpected.length > 0)
					return {
						pass: false,
						message: () =>
							[
								`expected Result to only contain error(s): [${expected.map(formatExpectedValue).join(", ")}]`,
								`received unexpected error(s): [${unexpected.map(formatExpectedValue).join(", ")}]`,
								formatErrors(received.error),
							].join("\n"),
					};

				if (errors.length !== expected.length)
					return {
						pass: false,
						message: () =>
							[
								`expected Result to contain exactly ${expected.length} error(s)`,
								`received ${errors.length} error(s)`,
								`expected: [${expected.map(formatExpectedValue).join(", ")}]`,
								formatErrors(received.error),
							].join("\n"),
					};
			}
		}

		return {
			pass: true,
			message: () =>
				expectedErrors !== undefined
					? `expected Result not to contain error(s): ${
							Array.isArray(expectedErrors)
								? expectedErrors
										.map((error) => (typeof error === "object" && error !== null ? format(error) : String(error)))
										.join(", ")
								: typeof expectedErrors === "object" && expectedErrors !== null
									? format(expectedErrors)
									: expectedErrors
						}`
					: "expected Result not to be Err",
		};
	},
});

interface CustomMatchers<R = unknown> {
	toBeOk(): R;
	toBeErr(expectedErrors?: ExpectedError | ExpectedError[], strict?: boolean): R;
}

declare module "vitest" {
	interface Assertion<T> extends CustomMatchers<T> {}
	interface AsymmetricMatchersContaining extends CustomMatchers {}
}

function clearDocumentCookies() {
	document.cookie.split(";").forEach((cookie) => {
		// biome-ignore lint/suspicious/noDocumentCookie: testing
		document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
	});
}

const localStorageMock = new StorageMock();
const sessionStorageMock = new StorageMock();

vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("sessionStorage", sessionStorageMock);

afterEach(() => {
	const root = document.documentElement;

	for (const attribute of root.attributes) root.removeAttribute(attribute.name);

	root.style.cssText = "";

	document.head.replaceChildren();

	vi.clearAllMocks();
	vi.clearAllTimers();

	clearDocumentCookies();
	resetTestEnv();

	globalThis.localStorage.clear();
	globalThis.sessionStorage.clear();
});
