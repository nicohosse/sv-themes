---
"sv-themes": major
---

Add SvelteKit 3 support and make theme state safe across concurrent SSR requests.

- `createThemeHandle` resolves each request into an isolated snapshot exposed on `event.locals.svThemes`. It accepts either a shared manager or a per-request factory without mutating the shared manager during SSR.
- Add the DOM-free `sv-themes/spa` entry point for inlining the boot script in client-only Svelte apps. The generated script is self-contained, escapes serialized arguments, and resolves nested forced themes with depth-aware precedence.
- Add `ThemeType`, per-theme `favicon` support through the `useFavicon` option, and alpha-preserving CSS color resolution for theme colors.
- Persistence reads happen synchronously during initialization, removing the initial theme delay.
- Rename the `ForceTheme` component to `ThemeScope`. Scoped overrides keep nested parent/child locks, priority resolution, unmount cleanup, and SSR/client parity.
