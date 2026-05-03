import { createThemeHandle } from "sv-themes/server";
import { themeManager } from "$lib/theme-manager.svelte";

export const handle = createThemeHandle(themeManager);
