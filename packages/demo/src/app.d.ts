// https://svelte.dev/docs/kit/types#app.d.ts

import type { ThemesOf } from "sv-themes";
import type { themeManager } from "$lib/theme-manager.svelte";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			forcedTheme?: ThemesOf<typeof themeManager>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
