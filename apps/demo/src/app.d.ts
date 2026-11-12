import type { ThemeManagerSnapshot } from "sv-themes";

// https://svelte.dev/docs/kit/types#app.d.ts

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			svThemesScriptNonce?: string;
			svThemes?: ThemeManagerSnapshot;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
