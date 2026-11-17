---
"sv-themes": major
---

Add SvelteKit 3 support, locally scoped themes, and request-isolated theme state for concurrent SSR.

- `createThemeHandle` resolves each request into an isolated snapshot exposed on `event.locals.svThemes`. It accepts either a shared manager or a per-request factory without mutating the shared manager during SSR.
- Add the DOM-free `sv-themes/spa` entry point for inlining the boot script in client-only Svelte apps. The generated script is self-contained, escapes serialized arguments, and resolves nested forced themes with depth-aware precedence.
- Add `ThemeType`, per-theme `favicon` support through the `useFavicon` option, and alpha-preserving CSS color resolution for theme colors.
- Persistence reads happen synchronously during initialization, removing the initial theme delay.
- Rename the `ForceTheme` component to `ThemeScope`. Global scopes keep nested parent/child locks, priority resolution, unmount cleanup, and SSR/client parity.
- **Breaking:** `ThemeScope` replaces the `forcedTheme` prop with `theme`. Add `mode="global"` to keep document-wide forcing, or omit `mode` to theme a subtree only.
- Add locally scoped themes. `ThemeScope` now takes a single `theme` and a `mode`:
	- `mode="local"` (default) applies the theme to its own subtree only. It renders a configurable wrapper (`as`, `class`, `style`, plus forwarded attributes) carrying the theme attributes and `color-scheme`, without changing the document root, persistence, selected/forced state, or lifecycle events.
	- `mode="global"` forces the document root, with the existing priorities and `overrideChildren` locks.
	- `theme="system"` resolves through your configured system mappings, follows OS changes, and local system scopes bootstrap before first paint with a small inline script. Pass `cspNonce` to `ThemeScope` when using a CSP with nonces.
	- Local scopes accept `prepaint={{ storage: "localStorage" | "sessionStorage", key }}` to read a persisted theme id or `"system"` and apply it before first paint, using `theme` as the server-rendered fallback. The scope follows cross-tab `storage` events; `theme` prop updates take over, and same-document storage writes still need a prop update or a dispatched `StorageEvent`. Client-only state that cannot be read synchronously before paint still needs a server-known source such as a cookie.
	- Components inside a local scope see the scoped theme through `getThemeManager().resolvedTheme` and `resolvedUseSystemTheme`; other manager state and methods stay global.
