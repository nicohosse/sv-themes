import type { Config } from "@sveltejs/kit";

const config: Config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes("node_modules") ? undefined : true),
	},
};

export default config;
