---
"sv-themes": major
---

Add SvelteKit 3 support, locally scoped themes, and request-isolated theme state for concurrent SSR.

- `createThemeHandle` resolves each request into an isolated snapshot exposed on `event.locals.svThemes`. It accepts either a shared manager or a per-request factory without mutating the shared manager during SSR.
- Add the DOM-free `sv-themes/spa` entry point for inlining the boot script in client-only Svelte apps. The generated script is self-contained, escapes serialized arguments, and resolves nested forced themes with depth-aware precedence.
- Add `ThemeType`, per-theme `favicon` support through the `useFavicon` option, and alpha-preserving CSS color resolution for theme colors.
- Persistence reads happen synchronously during initialization, removing the initial theme delay.
- Rename the `ForceTheme` component to `ThemeScope`. Global scopes keep nested parent/child locks, priority resolution, unmount cleanup, and SSR/client parity.
- Add locally scoped themes. `ThemeScope` now takes a single `theme` and a `scope`:
	- `scope="local"` (default) applies the theme to its own subtree only. It renders a configurable wrapper (`as`, `class`, `style`) carrying the theme attributes and `color-scheme`, without changing the document root, persistence, selected/forced state, or lifecycle events.
	- `scope="global"` forces the document root, with the existing priorities and `overrideChildren` locks.
	- `theme="system"` resolves through your configured system mappings and follows OS changes.
	- Components inside a local scope see the scoped theme through `getThemeManager().resolvedTheme`; other manager state and methods stay global.
