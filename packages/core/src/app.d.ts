// https://svelte.dev/docs/kit/types#app.d.ts

import type { DefaultTheme } from "$lib/types.ts";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			forcedTheme?: DefaultTheme;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
