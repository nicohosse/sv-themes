import { describe, expect, it } from "vitest";
import { createThemes } from "./theme.js";

describe("createThemes", () => {
	it("should transform a theme array into a ThemeRecord", () => {
		const input = [
			{ id: "light", type: "light" as const },
			{ id: "dark", type: "dark" as const },
		];

		const themes = createThemes(input);

		expect(themes).toEqual({
			light: input[0],
			dark: input[1],
		});
	});

	it("should flatten duplicated themes by using the last one in the returned ThemeRecord", () => {
		const input = [
			{ id: "light", type: "light" as const },
			{ id: "light", type: "dark" as const },
		];

		const themes = createThemes(input);

		expect(themes).toEqual({
			light: input[1],
		});
	});
});
