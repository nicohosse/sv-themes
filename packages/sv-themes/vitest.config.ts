import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte(), svelteTesting()],
	test: {
		environment: "jsdom",
		restoreMocks: true,
		clearMocks: true,
		mockReset: true,
		setupFiles: ["./src/lib/tests/setup.ts"],
		include: ["src/**/*.test.ts"],
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
		},
		coverage: {
			exclude: [
				"index.ts",
				"tests/**.ts",
				"core/errors.ts",
				"core/theme/index.ts",
				"core/theme-manager/errors.ts",
				"core/theme-manager/events.ts",
			],
		},
	},
	resolve: process.env.VITEST
		? {
				conditions: ["browser"],
			}
		: undefined,
});
