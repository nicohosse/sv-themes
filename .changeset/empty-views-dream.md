---
"sv-themes": patch
---

**DOM Timing Fix**: Resolved a timing issue where client-side `$effect` runes dependent on `themeManager.resolvedTheme` would execute before the root element's DOM attributes actually finished updating.

**OKLCH Color Support**: Added support for the modern `oklch` color space in the CSS color resolver utility (`resolveCssColor`).

**Documentation**: Documented the utility type `ThemesOf<ThemeManager>` in the `README.md`.
