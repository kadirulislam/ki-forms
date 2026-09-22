# Changelog

All notable changes to ki-forms are documented here.

## [2.3.0] - 2026-09-22

### Added

- Canonical schema layer `src/schema/*`: `validateFields`, `validateDocument`, `normalizeDocument`, single `evaluateCondition` engine shared by runtime, Studio, export, and docs.
- `KiFormDocument`, `Condition`, `defineFields`, `InferFormValues` with generic `KiForm` / `useKiForm` value typing.
- `showIf` as single source of truth for conditional required validation in runtime and `buildZodSchema`; legacy `requiredWhen` retained as deprecated compat only.
- Studio deterministic React export with `defaultValue`, `className`, escaped endpoint, `onChange` warnings, TS mode, `validation: "zod"` readable `z.object` generation, and schema-block round-trip (`toRoundTripSnippet` / `importSchemaBlock`).
- Studio full document import (fields + theme, variant, endpoint) with path-specific errors and no silent fallback; Import-code tab.
- Studio visual `all` / `any` condition-group editor with add/remove, readable summary, and unknown-field warnings.
- Light multi-page docs site (`/`, `/docs/*`, `/playground`) with live demos, search, copy buttons, prev/next; Studio remains at `/studio/`.
- Parity, Zod-export, condition-editor, and docs-example test coverage (141 tests).

### Fixed

- Split `KiForm` into managed/controlled views (no conditional hooks).
- Reconcile values/errors when fields change; fix empty-number (`""` not `0`) and checkbox defaults; move `onChange` out of state updater.
- Associate labels/inputs with IDs and ARIA error wiring; theme-aware submit class.
- Hidden fields skip external schema errors.

## [Unreleased]

### Planned

- Scoped custom CSS preview and separate CSS export.
- AI prompt box with bring-your-own-key support.
- Formal JSON Schema specification for editor autocomplete and LLM output.

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
