import "@testing-library/jest-dom/vitest";
import { format } from "@vitest/pretty-format";
import type { Result } from "neverthrow";
import { afterEach, expect, vi } from "vitest";
import type { LibError } from "$lib/index.js";
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

	toBeErr(received: Result<unknown, LibError>, expectedTypes?: LibError["id"] | LibError["id"][], strict = false) {
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

		if (expectedTypes) {
			const expected = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];

			const receivedTypes = errors.map((error) => error.id);

			const missingTypes = expected.filter((type) => !receivedTypes.includes(type));

			if (missingTypes.length > 0)
				return {
					pass: false,
					message: () =>
						[
							`expected Result to contain error type(s): [${expected.join(", ")}]`,
							`missing error type(s): [${missingTypes.join(", ")}]`,
							`received error types: [${receivedTypes.join(", ")}]`,
							formatErrors(received.error),
						].join("\n"),
				};

			if (strict) {
				const unexpectedTypes = receivedTypes.filter((type) => !expected.includes(type));

				if (unexpectedTypes.length > 0)
					return {
						pass: false,
						message: () =>
							[
								`expected Result to only contain error type(s): [${expected.join(", ")}]`,
								`received unexpected error type(s): [${unexpectedTypes.join(", ")}]`,
								formatErrors(received.error),
							].join("\n"),
					};

				if (receivedTypes.length !== expected.length)
					return {
						pass: false,
						message: () =>
							[
								`expected Result to contain exactly ${expected.length} error(s)`,
								`received ${receivedTypes.length} error(s)`,
								`expected: [${expected.join(", ")}]`,
								`received: [${receivedTypes.join(", ")}]`,
								formatErrors(received.error),
							].join("\n"),
					};
			}
		}

		return {
			pass: true,
			message: () =>
				expectedTypes
					? `expected Result not to contain error type(s): ${
							Array.isArray(expectedTypes) ? expectedTypes.join(", ") : expectedTypes
						}`
					: "expected Result not to be Err",
		};
	},
});

interface CustomMatchers<R = unknown> {
	toBeOk(): R;
	toBeErr(expectedTypes?: LibError["id"] | LibError["id"][], strict?: boolean): R;
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
