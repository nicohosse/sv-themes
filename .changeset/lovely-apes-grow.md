---
"sv-themes": major
---

Add SvelteKit 3 support and make theme state safe across concurrent SSR requests.

- `createThemeHandle` resolves each request into an isolated snapshot exposed on `event.locals.svThemes`. It accepts either a shared manager or a per-request factory without mutating the shared manager during SSR.
- Add the DOM-free `sv-themes/spa` entry point for inlining the boot script in client-only Svelte apps. The generated script is self-contained, escapes serialized arguments, and resolves nested forced themes with depth-aware precedence.
- Add `ThemeType`, per-theme `favicon` support through the `useFavicon` option, and alpha-preserving CSS color resolution for theme colors.
- Persistence reads happen synchronously during initialization, removing the initial theme delay.
- Rename the `ForceTheme` component to `ThemeScope`. Scoped overrides keep nested parent/child locks, priority resolution, unmount cleanup, and SSR/client parity.
- Add locally scoped themes: `ThemeScope` accepts `theme` to apply a theme to its own subtree without mutating the document root, the manager's selected/forced state, storage, lifecycle events, or global forced-theme overrides. Local scopes render a configurable wrapper (`as`, `class`, `style`) carrying the configured theme attributes and `color-scheme`; `theme="system"` resolves through the configured mappings and follows OS changes. `forcedTheme` keeps its existing global behavior, and both props can be combined.
