# Changelog

All notable changes to ki-forms are documented here.

## [Unreleased]

## [2.5.0] - 2026-09-27

The "agents first" release. A form an agent writes should be a form you would have written, and sharing one should not need an account.

### Added

- **MCP server** (`ki-forms-mcp`, shipped in-package, no global install). A stdio JSON-RPC server exposing the canonical validator, the template catalog, and the React export generator.
  - Tools: `validate_schema` (every issue, with its path), `list_templates`, `scaffold_form` (natural language → component + schema), `export_component` (schema → ready-to-paste React, optionally with zod).
  - Tools return file *contents*, never write to disk. The agent already has file tools; a server that silently writes files is a worse default and harder to compose. `ki-forms add` remains the path that writes.
  - The published JSON Schema is served as a resource at `ki-forms://schema/ki-form.schema.json`, so an agent authors against the real contract instead of guessing property names.
  - Every tool is a thin shim over a function that already exists and is already tested. `validate_schema` is asserted to return exactly what `validateFields`/`validateDocument` return — that identity is the whole argument for shipping it, and the test suite pins it.
  - Scope is deliberately a tools subset, not a reference implementation: `initialize`, `tools/*`, `resources/*`. MCP is a moving target; a focused server that works in a real client today is worth more than a complete one that half-works.
  - CI spawns the built binary and drives a real `initialize` → `tools/list` → `tools/call` handshake, including the two things that actually break: a notification must produce no response, and stdout must stay free of anything but protocol messages.
- **Share links.** A whole form travels in the URL *fragment*, which browsers never send to a server — so sharing needs no account, no backend, and no privacy caveat, and it fits the portable-JSON positioning rather than working against it.
  - Studio: *Copy share link* in the overflow menu. Opening a link decodes it, runs it through the same importer the JSON import uses, and applies it; a canvas that already has fields asks first, exactly like loading a template. The hash is consumed on read so a refresh does not re-prompt.
  - CLI: `ki-forms share <file>` prints a Studio link (`--origin` to point at a self-hosted Studio, `--out` to write it to a file).
  - Encoding is `JSON → UTF-8 → deflate-raw → base64url` using the native `CompressionStream` (Chrome 80+, Safari 16.4+, Firefox 113+, Node 20+) — zero dependencies. A realistic form is 200–500 characters, short enough to survive a chat client. The payload is versioned (`ki=v1.`) so the format can change without breaking old links.
  - The codec only moves bytes and never validates: a decoded payload is `unknown` until it passes the canonical importer, exactly like a hand-edited JSON file. Damaged links report a plain error instead of surfacing a decoder exception, and a hard size guard keeps a link from becoming something a chat client truncates.
- Phase 2 distribution: the `ki-forms` CLI ships with the package (`npx ki-forms ...`, no global install).
  - `add [name]` scaffolds a ready-to-paste component plus a portable schema document, inferring the template from the phrase (`"waitlist form"` → `waitlist`). Options: `--template`, `--dir`, `--component`, `--js`, `--zod`, `--variant`, `--endpoint`, `--force`, `--dry-run`, `--json`. Refuses to overwrite without `--force`; writes nothing on `--dry-run`.
  - `list` prints the template catalog, `validate <file>` reports path-specific issues, and `export <file>` emits the component to stdout or `--out`.
  - Exit codes are script-friendly: `0` success, `1` validation/IO failure, `2` usage error. `--json` makes `add` machine-readable for agents.
  - The React/Zod codegen and template catalog moved from `studio/lib/*` to `src/codegen/*` so the CLI and the Studio emit byte-identical output; the Studio import paths are preserved as re-exports. Exporting a schema that `add` just wrote reproduces the component byte-for-byte, asserted in CI.
- Studio templates panel: templates became a left-panel tab (the modal is gone) with `Wireframe` previews of the real generated markup, and applying one asks before it replaces a non-empty canvas.
- Two-column layout: `width: "half" | "full"` on any field, defaulting to `full`. A trailing odd half stretches, and the pair collapses to one column below 480px. Supported through the schema, runtime, CSS, export, Studio, and docs. `box-sizing: border-box` on the grid so a half-width field cannot overflow its column.
- Device-frame preview: Preview renders inside vector MacBook / iPad / iPhone frames drawn in CSS and SVG, not photography — avoiding both trademark issues and an MIT-licensed image dependency. `tablet` joins `desktop` and `mobile` in the canvas switcher, and the frame reuses `StudioModal`.
- Validation UX:
  - Conservative `autocomplete` inference so browsers can fill fields for you. It never guesses `password`, and you can always set it explicitly.
  - `messages` accepts plain strings per field, so the error text you ship is the error text the user reads.
  - `validateOn="blur"` (default `"submit"`) so a form does not yell at someone mid-typing.
  - `aria-required` is always set; native `required` never is — the browser's own bubble would bypass your messages and styling.
  - `requiredMarker` reaches fields through React context, not through `FormApi` or `FieldComponentProps`, keeping the frozen `useKiForm` surface additive-only.
  - The exporter's hand-maintained `isBareText` list is gone, replaced by derivation from the emitted `extras`; `errorForField` is now a shared helper.
- Docs: MCP server and Share links pages; CLI, layout, and validation UX pages for this release.

### Fixed

- CLI schema loading strips a UTF-8 BOM. Windows editors and PowerShell's `Out-File -Encoding utf8` write one, and `JSON.parse` rejects it — the file was still a valid schema.
- Studio Code & Schema modal responsiveness: the action toolbar no longer clips its buttons off on phones (it wraps, and labels collapse to icons below `sm`), the five-tab strip fits or scrolls instead of overflowing, and tab panes scroll rather than clipping content below the editor on short viewports. Removed a duplicate "Import from code" button that appeared in both the toolbar and the pane.
- Editor sizing inside modals now clamps to viewport height. A previous `flex-1` with an explicit `height` collapsed the editor to ~65px, because `flex-1` sets `flex-basis: 0` and discards the height.
- `vitest` `testTimeout` raised to 15s. "mounts the shell with topbar, drawer rail and canvas" was failing against the 5s default on a 5-6s cold jsdom mount of the whole Studio App.

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

## [2.4.0] - 2026-09-22

### Added

- Shared Studio modal primitives (`StudioModal`, copy/code-editor/validation/confirm building blocks) with focus restoration and consistent mobile sizing; Code modal renamed to Code & Schema with live all-errors validation, import previews, Reset/Download actions, export Settings (TS/JS, theme, endpoint, Zod, schema marker), and confirm-before-replace.
- Documentation modal rebuilt as a 13-section handbook with search, prev/next navigation, copyable examples, and per-feature limitations.
- Formal `schema/ki-form.schema.json` (draft-07, published as `ki-forms/schema.json`) with Ajv parity tests against the canonical TypeScript validator.
- Accessibility hardening: axe coverage, focus-first-error on failed submit, linked multi-error summary, conversational step announcements + step focus, checkbox label/ARIA wiring, Studio modal focus restoration.
- Field constraints (`minLength`, `maxLength`, `pattern`, `min`, `max`) across schema, runtime, Zod adapter + readable export, JSON Schema, Studio Inspector, import/export, and docs.
- Scoped document-level custom CSS: Style-panel editor, `[data-ki-preview]` scoped canvas + Preview rendering, separate CSS export tab, document import support with breakout/size guards. The core runtime never injects CSS.
- BYOK AI schema authoring panel: OpenAI-compatible endpoint, session-only key storage, validated proposal preview with accept/discard and confirm-before-replace.

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
