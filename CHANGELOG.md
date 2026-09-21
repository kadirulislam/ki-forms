# Changelog

All notable changes to ki-forms are documented here.

## [Unreleased]

### Fixed

- Schema Studio React exports now generate valid theme object syntax.
- Theme values and generated field strings are escaped safely, including font stacks containing quoted family names.
- Schema Studio React exports now include the `ki-forms/styles.css` import.
- Schema Studio JSON and React export tabs now stay within the viewport on narrow screens.
- Copying from the Schema JSON tab now uses the current editor contents.

### Planned

- In-app Schema Studio documentation guide.
- Field-level `className` editing and export support.
- Scoped custom CSS preview and separate CSS export.

## [2.2.0] - 2026-09-21

### Added

- Optional `endpoint` submissions with `{ values, meta }` payloads.
- `POST` and `PUT` submission methods, custom headers, and endpoint lifecycle status.
- `onSubmitted` callback for successful and failed endpoint requests.
- Google Apps Script and Google Sheets collection flow in Schema Studio.
- Responsive Schema Studio shell with mobile drawer, docked inspector, and overflow actions.
- Touch-friendly field movement fallback and keyboard shortcuts in Studio.
- `tel`, `url`, and `date` field blocks.
- Live theme CSS variable synchronization in the Studio preview.
- High-contrast light and dark Studio tokens.

### Changed

- Improved Studio field cards, selection states, buttons, tabs, and light-mode visibility.
- Updated package exports and declarations for the collect-responses API.

## [2.1.0] - 2026-09-21

### Added

- Conditional `all` and `any` groups.
- Theme tokens for the built-in form styles.
- Zod schema generation through `ki-forms/zod`.
- Conversational, one-field-at-a-time form rendering.
- Checkbox field support and renderer registration.
- Compatibility, theme, conditional-group, conversational, and Zod test coverage.
- Schema Studio MVP with drag-and-drop editing and export.

### Changed

- Replaced untyped field renderer boundaries with public TypeScript types while preserving the existing API.
- Added CI checks for typechecking, tests, library build, demo build, and Studio build.

## [2.0.0]

The compatibility baseline for the current additive API. See the v2.0.0 tag and README history for the original release details.
