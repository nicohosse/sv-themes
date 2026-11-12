---
"sv-themes": major
---

Add SvelteKit 3 support along with SSR isolation, SPA bootstrapping, favicons, and alpha-preserving colors.

- `createThemeHandle` resolves each request into an isolated snapshot exposed on `event.locals.svThemes`, and accepts either a shared manager or a per-request factory without mutating the shared manager during SSR.
- The boot script is injected before `</head>`, escapes serialized arguments, and resolves nested forced themes with depth-aware precedence.
- Add the DOM-free `sv-themes/spa` entry point for inlining the boot script in client-only Svelte apps.
- Add `ThemeType`, per-theme `favicon` support through `useFavicon`, and alpha-preserving CSS color resolution for theme colors.
- Persistence reads happen synchronously during initialization, removing the initial theme delay.
- Adopt SvelteKit 3 conventions: `#lib` subpath imports, configuration in `vite.config.ts`, `$app/tsconfig`, and `@sveltejs/kit/hooks` types.
- Rename internal modules and directories to camelCase.
