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
- Studio: right-click any field for a context menu, the affordance drag-and-drop editors use for field actions. The menu is context-aware — it only offers what applies to that field, and anything with more than one possible value opens a submenu rather than a toggle: Label (show/hide), Width (full/half, radio), Show only when (any other field, excluding itself), and Type (all 11, radio). Toggling a type away from `select` drops its `options` rather than exporting dead configuration. Every action writes through the same `patchField` the Inspector uses, so a right-click change and a side-panel change are the same code path and the same undo entry. Bound moves are marked disabled instead of silently doing nothing.
- Studio: the Preview dialog is resizable — drag the corner, right edge, or bottom edge, or focus a handle and use the arrow keys. The size is remembered per browser, re-clamped against the viewport when the window shrinks (a size saved on an external monitor must not open off-screen), floored at a readable 360×320, and restorable from a *Reset size* control that only appears once you have moved it. The toolbar was rebuilt at the same time: a segmented device control instead of three separate buttons, and state reduced to quiet inline text.
- Studio: both side panels are permanently docked. The left palette used to collapse into a modal drawer below `lg` and the Inspector used to float over the canvas until `xl`, so the tools you work with kept vanishing and reappearing. Both are now always in the layout at every width; the existing toggles are the only thing that changes their width, and the collapse preference is persisted. Measured at 390/820/1024/1280/1440px: both panels compute to `position: static`, take layout space, and never overlap the canvas.
- Studio: the Docs button now links to the real documentation site instead of opening an in-app modal. The modal was a strict subset of the docs pages, which is exactly the two-places-to-keep-in-sync problem; deleting it leaves one copy, and the one that ships. The URL is derived from where the Studio is served, so it is correct on a published site, at a subpath, or in dev.
- Studio: the desktop device frame's screen is 1280×720 rather than 1280×500. The old value is a 2.56:1 letterbox that read as a banner rather than a laptop.
- Fixed: the right column was gated on a field being selected, so it disappeared entirely the moment you clicked the canvas — the opposite of docked. It is now permanently present: field settings when something is selected, and a read-only **form overview** when nothing is (form name, field and type count, layout, condition count, endpoint, custom CSS). A docked column that blanks out is worse than no column.
- Fixed: the context menu's *Show only when* wrote `showIf: { field }` with no comparison, which the canonical validator rejects — and because `loadDoc` replaces the *whole* field array with the fallback template when validation fails, choosing a condition and reloading silently destroyed the user's form. The comparison is now seeded (`equals: ""`), so the document stays valid and the user has one edit left in the condition editor. A regression test asserts every field shape the menu can write passes `validateFields`, and that the bare shape is rejected.
- Studio: a clean-UI pass on the inspector, after comparing it against Divi's builder. The gap was mechanical rather than cosmetic — Divi's right panel is a short list of collapsed rows, while the inspector showed every control at once, so the eye had no way to find the one it needed.
  - The field inspector is now six collapsible sections — Content, Rules, Autofill & messages, Layout, Logic, Actions — with only Content open by default. Collapsed, a section is a 38px header row; expanded, ~400px. The panel went from a wall of inputs to a scannable list.
  - Sections carry keywords and the panel has a *Search settings* field, so typing `half` leaves only Layout. A matching section is force-expanded, because a search hit hidden behind a collapsed header is no use.
  - A dot on a collapsed header means "non-default here", so a section you have already customised is still discoverable without being open.
  - The panel header is a breadcrumb (`Job application › email`) rather than a generic "Field settings" label — in a 336px column, knowing *which* field you are editing is the entire job of that header.
  - Duplicate inner labels were removed where a section header now names the same thing.
- Studio: a slate-and-compact pass, so the canvas gets the room.
  - **The accent is now slate, not terracotta.** It had crept onto the brand mark, the active rail icon, the Copy Code button, the selection border, the field badges and the focus ring — so the loudest thing on screen was the editor rather than the form. A neutral slate keeps selection legible (a dark rule on white is a strong signal) while leaving the canvas the only saturated thing. The form's own accent is a separate token and is unaffected. Dark mode moved off the warm zinc ramp onto slate for the same reason.
  - **Blocks palette: 130px wireframe cards in a two-column grid → 32px rows in one column.** The same ten types now take a third of the height, so the whole palette and its hint fit without scrolling and it stops competing with the canvas.
  - **Panels narrowed and chrome trimmed**, measured in Chrome at 1920×1000: rail 64→56, palette 320→256, inspector 336→288, so chrome went 720→600px and the canvas 1200→1320px. Header 56→48, panel and canvas sub-headers to 40, section headers and inspector rows tightened, corner radius 12→10px.
- Fixed: `--studio-accent` is declared in `ui.css` *and* written from `App.tsx` onto the document element so a preset can override it at runtime. The inline write happens after the stylesheet, so the JS value is the one the page actually resolves — and the two had silently drifted, leaving the studio orange after the tokens were changed with no error anywhere. A test now asserts they agree, and that no retired terracotta value survives in the studio sources.
- Fixed: the CLI strips a UTF-8 BOM when loading a schema file (see above).
- Fixed: `waitFor` keeps its own 1s default, which vitest's `testTimeout` does not change, so waits on portal-rendered overlays failed against a cold Studio mount. Added a helper with room for the 5-6s mount.
- Fixed: Radix modal overlays leave `aria-hidden` and `pointer-events` state behind in jsdom, which leaked between tests. `tests/setup.ts` now resets those markers after each test.

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
