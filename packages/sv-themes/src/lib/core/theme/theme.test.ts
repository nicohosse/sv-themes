import { describe, expect, it } from "vitest";
import { expectOk } from "$lib/tests/setup.js";
import { createThemes } from "./theme.js";

describe("createThemes", () => {
	it("should transform a unique theme array into a valid ThemeRecord", () => {
		const input = [
			{ id: "light", type: "light" as const },
			{ id: "dark", type: "dark" as const },
		];

		const themes = expectOk(createThemes(input));

		expect(themes).toEqual({
			light: input[0],
			dark: input[1],
		});
	});

	it("should return Err NoThemes when provided with an empty array", () => {
		expect(createThemes([])).toBeErr("NoThemes");
	});

	it("should return Err DuplicateTheme when multiple themes share the same ID", () => {
		expect(
			createThemes([
				{ id: "light", type: "light" },
				{ id: "light", type: "light" },
			]),
		).toBeErr("DuplicateTheme");
	});
});
