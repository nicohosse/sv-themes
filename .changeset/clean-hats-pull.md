---
"sv-themes": patch
---

- **Select Event**: Added the `select` lifecycle event (`ThemeSelectEvent`), firing immediately after a user theme preference is selected but prior to transition execution.
- **Context Getter**: Added `getThemeManager` to the `createAppThemeManager` return payload for cleaner context retrieval in Svelte 5 applications.
- **State Guarding**: Added a `ForcedThemeActive` error to block `setUseSystemTheme` and `setSelectedTheme` calls when a temporary forced theme is active.
- **Type Normalization**: Normalized internal configuration properties from optional booleans (`boolean?`) to strict, non-nullable boolean types.
- **Forced Theme Resolution**: Fixed a bug where `undefined` forced themes were skipped leading to unwanted behaviour.
- **Bundle Optimization**: Excluded unnecessary files from the published `/dist` package directory to reduce bundle size.
- **Documentation**: Restructured the `README.md` to document the new `ThemeSelectEvent` and the complete `ThemeManagerError` validation registry.
- **Theme Selector Action**: Added `onError` callback to the themeSelector action aswell as an optional `themeManager` argument for type-safety.
