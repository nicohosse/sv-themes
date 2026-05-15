import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte(), svelteTesting()],
	test: {
		environment: "jsdom",
		setupFiles: ["./src/lib/tests/setup.ts"],
		include: ["src/**/*.test.ts"],
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
		},
		execArgv: ["--localstorage-file", path.resolve(os.tmpdir(), `vitest-${process.pid}.localstorage`)],
	},
	resolve: process.env.VITEST
		? {
				conditions: ["browser"],
			}
		: undefined,
});
