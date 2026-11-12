import type { ThemeManagerSnapshot } from "#lib/core/snapshot.js";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			svThemesScriptNonce?: string;
			/**
			 * The request-scoped theme snapshot created by `createThemeHandle`.
			 */
			svThemes?: ThemeManagerSnapshot;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}
