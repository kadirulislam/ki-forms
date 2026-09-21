# ki-forms Product & Engineering Plan

> Last updated: 2026-09-21
> Current release: **2.2.0**
> Status: **Phase 0 shipped**. The core library, tests, Schema Studio MVP, responsive Studio shell, and collect-responses flow are implemented.

## Vision

**AI writes the schema, ki-forms renders it, and the application owns the code.**

ki-forms is a native React form renderer for portable JSON schemas. It avoids hosted-form lock-in while giving developers a small API, built-in fields, conditional logic, validation integration, theming, conversational mode, and a visual Schema Studio.

## Current State

- **Package:** `ki-forms@2.2.0`
- **Distribution:** ESM, CommonJS, TypeScript declarations, and `ki-forms/styles.css`
- **Runtime:** React 18 or newer
- **Optional validation:** Zod 3 or 4 through `ki-forms/zod`
- **Quality gates:** Vitest tests, strict TypeScript checks, library build, demo build, and Studio build in CI
- **Examples:** live demo and Schema Studio are published through GitHub Pages

## Shipped Features

### Core library

- JSON-based form definitions
- Smart field defaults and generated labels/placeholders
- Built-in `text`, `email`, `password`, `number`, `tel`, `url`, `date`, `textarea`, `select`, and `checkbox` fields
- Custom field renderer components
- Field-level `onChange` callbacks
- Conditional fields using a single condition or `all` / `any` groups
- Hidden conditional fields skipped during validation
- Optional Zod schema generation compatible with Zod 3 and 4
- Theme tokens mapped to `--ki-*` CSS variables
- Classic and conversational rendering variants
- Direct form control through `useKiForm`

### Collect Responses

- Optional `endpoint` submission with `{ values, meta }` JSON payloads
- `POST` and `PUT` methods with custom headers
- Pending, success, and error status labels
- `onSubmitted` lifecycle callback
- Google Apps Script compatibility using `text/plain` requests where required
- Works with JSON-compatible services such as Formspree, Web3Forms, Basin, and automation webhooks

### Schema Studio

- Drag-and-drop field canvas
- Field property editing with live preview
- JSON schema export
- Ready-to-paste React export
- Valid React export with escaped values, theme syntax, and `ki-forms/styles.css` import
- Shadcn-inspired presets
- Responsive inspector and mobile drawer layout
- Google Sheets collection flow with generated Apps Script
- Light and dark high-contrast themes

## Compatibility Policy

The public API follows an additive compatibility path. Existing `2.0.0` schemas and the frozen `useKiForm` controller keys remain supported. New capabilities are optional props or additional field types.

The compatibility suite covers the published `2.0.0` README examples and runs with the current test suite on every CI build.

## Roadmap

### Phase 1: Schema authoring improvements

- In-app Schema Studio documentation guide with contextual help
- Field-level `className` editing and export support
- Custom CSS editor with scoped live preview and CSS export
- AI prompt box with bring-your-own-key support
- Visual builder for editing `all` / `any` condition groups
- Formal JSON Schema specification for editor autocomplete and LLM output
- More accessible and extensible field primitives where demand warrants them

### Phase 1.1: Studio polish and customization

- Add Docs to the desktop toolbar and mobile overflow menu.
- Organize the guide around quick start, fields, conditions, themes, responses, styling, and export.
- Expose the existing library `Field.className` capability through the Inspector.
- Preserve `className` in JSON and React exports with safe string serialization.
- Add optional document-level custom CSS, scoped to the preview form.
- Export custom CSS separately rather than expanding the library runtime API.
- Consider an additive `wrapperClassName` field later for layout-level styling without changing existing `className` behavior.

### Phase 2: Distribution

- CLI scaffolding, for example `npx ki-forms add "waitlist form"`
- MCP tooling for coding agents
- Shareable schema links without requiring a hosted form account

### Phase 3: Optional infrastructure

- Dedicated hosted submission endpoints
- Webhooks and delivery retries
- Submission analytics

Infrastructure remains optional so the core library stays portable, self-hostable, and free of account requirements.

## Release Checklist

Before publishing a release:

1. Update `package.json` and `package-lock.json` together.
2. Update `CHANGELOG.md` and user-facing README examples.
3. Run `npm test`.
4. Run `npm run typecheck`.
5. Run `npm run build`.
6. Run `npm run demo:build` and `npm run studio:build`.
7. Inspect `npm pack --dry-run` for unintended files.
8. Publish the intended version and verify it from the npm registry.

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-21 | Additive API evolution | Protect existing early adopters and preserve published schemas. |
| 2026-09-21 | Studio is a schema studio, not a hosted form product | Export portable JSON and React code instead of creating lock-in. |
| 2026-09-21 | Conversational mode is built into the renderer | Provide the most useful Typeform-style interaction without changing ownership of the form. |
| 2026-09-21 | Endpoint submissions remain optional | Keep the library useful with any backend or no backend at all. |
| 2026-09-21 | Studio custom CSS exports separately | Keep CSS ownership in the consuming app and avoid adding runtime CSS injection to the core library. |
