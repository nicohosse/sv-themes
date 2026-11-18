import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// GitHub Pages serves project sites from /<repo>/, so the deploy workflow sets
// BASE_PATH. Local dev and preview keep the root path.
const base = (process.env.BASE_PATH ?? "") as "" | `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter(),
			paths: { base },
			compilerOptions: {
				runes: ({ filename }: { filename: string }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
		}),
	],
});
