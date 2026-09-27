# ki-forms

Build forms visually, export real React, and keep ownership of the implementation.

Stop wiring forms manually. Define them as data.

[![Try it live](https://img.shields.io/badge/⚡_TRY_IT_LIVE-playground-8b5cf6?style=for-the-badge&labelColor=0f172a)](https://kadirulislam.github.io/ki-forms/#/playground)
[![Schema Studio](https://img.shields.io/badge/🧩_SCHEMA_STUDIO-build_visually-6366f1?style=for-the-badge&labelColor=0f172a)](https://kadirulislam.github.io/ki-forms/studio/)
[![Docs](https://img.shields.io/badge/📖_DOCS-read_the_guide-4f46e5?style=for-the-badge&labelColor=0f172a)](https://kadirulislam.github.io/ki-forms/)

> **Interactive playground** — conditionals, themes, conversational mode, and
> live form renders running the real library. No install needed.
>
> **Schema Studio** — design forms visually: drag-and-drop fields, edit properties
> with live preview, then copy the schema JSON or a ready-to-paste React component.
>
> **Documentation** — the full guide: schema reference, conditions, TypeScript,
> Zod, Studio workflow, AI generation, custom CSS, formal JSON Schema, and endpoint security.

---

## ⚡ Quick Example

```jsx
import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

export default function App() {
  return (
    <KiForm
      fields={[
        "email",
        "password",
        {
          name: "role",
          options: ["User", "Admin"]
        },
        {
          name: "company",
          showIf: { field: "role", equals: "Admin" },
          required: true
        }
      ]}
      onSubmit={(data) => console.log(data)}
    />
  )
}
```

Pick “Admin” → the company field appears — and it's required only while visible.
One condition, one source of truth.

---

## 🤯 The Problem

Building forms in React is repetitive and inefficient:

- Managing state for every input  
- Handling validation manually  
- Writing conditional logic  
- Repeating boilerplate code  

Even popular libraries like React Hook Form require setup and mental overhead
for schema-driven, JSON-defined forms.

---

## ✅ The Solution

ki-forms lets you build forms using simple JSON — then take the code with you.

- No manual state handling  
- No boilerplate  
- No complex configuration  
- No hosted-form lock-in  

Just describe your form → it renders automatically → export real React you own.

```text
Studio → canonical schema → TypeScript/JavaScript → KiForm runtime
```

The same schema drives rendering, conditional logic, validation integration,
Studio preview, and generated code.

---

## 📦 Installation

```bash
npm install ki-forms
```

---

## 🚀 Basic Usage

```jsx
import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

<KiForm
  fields={["email", "password"]}
  onSubmit={(data) => console.log(data)}
/>
```

---

## 🧩 Field Configuration

```js
{
  name: "email",
  type: "email", // "text" | "textarea" | "email" | "password" | "number" | "select" | "checkbox" | "tel" | "url" | "date"
  required: true,
  label: "Email",
  placeholder: "Enter your email",
  helperText: "We never share your email",
  minLength: 5, // text-like values: min/max length, pattern (regex string)
  maxLength: 100,
  pattern: "^[^@]+@[^@]+$",
  min: 18, // number fields: min/max value
  max: 120
}
```

---

## 🎯 Smart Defaults

ki-forms automatically:

- Infers input types (`email`, `password`)  
- Generates labels (`firstName → First Name`)  
- Adds placeholders (`Enter your email`)  
- Converts simple strings into fields  

```jsx
fields={["email", "password"]}
```

---

## 🔄 Conditional Fields

Show fields dynamically based on other values — with `showIf` as the **single
source of truth**. A field with `required: true` is required exactly when it is
visible. No second condition to keep synchronized:

```js
{
  name: "company",
  showIf: {
    field: "role",
    equals: "Admin"
  },
  required: true
}
```

#### AND / OR groups

```js
{
  name: "taxId",
  required: true,
  showIf: {
    all: [
      { field: "country", equals: "US" },
      { field: "plan", equals: "Pro" }
    ]
  }
}
```

Use `all` (every condition must match) or `any` (at least one). A top-level
condition combines with groups via AND. Hidden fields skip validation.

> The legacy `requiredWhen` option is retained only for compatibility and is
> deprecated. New schemas, Studio exports, and generated code use `showIf`
> plus `required`.

---

## 🧠 Field Events

Run logic when a field value changes:

```js
{
  name: "role",
  options: ["User", "Admin"],
  onChange: (value, values) => {
    console.log("Selected:", value)
    console.log("All values:", values)
  }
}
```

> `onChange` is an escape hatch for code-defined forms — not portable schema
> data. It can't be represented in JSON, so Studio exports report it as
> application work instead of silently dropping it.

---

## 🔷 TypeScript

Static field definitions infer the shape of submitted values:

```tsx
import type { InferFormValues } from "ki-forms"

const fields = [
  { name: "email", type: "email", required: true },
  { name: "age", type: "number" }
] as const

type Values = InferFormValues<typeof fields>

function save(values: Values) {
  values.email // string
  values.age   // number | undefined
}
```

> Schemas loaded from an API or database can't create compile-time types by
> themselves. Validate dynamic data at the application boundary and provide
> an explicit type where needed.

---

## 🧩 Zod Schema Generation

Generate a validation schema from the same field config — using your own zod.
Conditional requiredness is derived from each field's `showIf` and `required`:

```jsx
import { KiForm } from "ki-forms"
import { buildZodSchema } from "ki-forms/zod"
import { z } from "zod"

const fields = [
  { name: "email", type: "email", required: true },
  {
    name: "company",
    showIf: { field: "role", equals: "Admin" },
    required: true
  }
]

<KiForm
  fields={fields}
  schema={buildZodSchema(fields, { zod: z })}
  onSubmit={save}
/>
```

`buildZodSchema` is a convenience for config-first forms — works with zod v3
and v4. Use a code-first Zod schema when complex refinements or maximum type
inference matter.

---

## 💬 Conversational Mode

One question at a time, Typeform-style — with a progress bar, Back/Next,
Enter-to-advance, and automatic jump-back to a failing step:

```jsx
<KiForm
  fields={fields}
  variant="conversational"
  stepLabels={{ next: "Continue", submit: "Send it" }}
  onSubmit={save}
/>
```

Hidden conditional fields are skipped automatically. Enter inside a textarea
inserts a newline instead of advancing.

---

## 🧱 Custom Field Components

Replace or extend built-in renderers with the `components` prop. A custom
component receives the field definition, current value, validation error, and
an `onChange` callback:

```jsx
function RatingField({ field, value, onChange, error }) {
  return (
    <div>
      <input
        type="range"
        min="1"
        max="5"
        value={value ?? 1}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {error && <p>{error}</p>}
    </div>
  )
}

<KiForm
  fields={[{ name: "rating", type: "text" }]}
  components={{ text: RatingField }}
/>
```

For the complete public API, see the exported TypeScript types: `Field`,
`KiFormProps`, `FormApi`, `KiTheme`, `InferFormValues`, and
`SubmitEndpointResult`.

---

## 🎨 Styling

Default styles included:

```js
import "ki-forms/styles.css"
```

Override using `className`:

```js
{
  name: "email",
  className: "my-custom-input"
}
```

---

## 🎨 Theming

Pass visual tokens — they become `--ki-*` CSS variables on the form element:

```jsx
<KiForm
  fields={["email", "password"]}
  theme={{
    accentColor: "#8b5cf6",
    radius: "12px",
    borderColor: "#334155"
  }}
/>
```

Available tokens: `accentColor`, `borderColor`, `errorColor`, `helperColor`,
`radius`, `surfaceColor`, `textColor`, `fontFamily`. Defaults match the
built-in styles, so no theme = zero visual change.

---

## ⚙️ Advanced Usage

Use the form hook directly:

```jsx
import { useKiForm, KiForm } from "ki-forms"

const form = useKiForm({
  fields: ["email", "password"]
})

<KiForm form={form} />
```

---

## 📋 Supported Features

- JSON-based form builder  
- Conditional fields + AND/OR groups (single source of truth)  
- Field constraints (length, pattern, numeric range)
- BYOK AI schema authoring (session-only key, proposal review)
- Scoped custom CSS (preview + separate export, runtime never injects)
- Formal JSON Schema (`ki-forms/schema.json`, draft-07)
- Smart defaults  
- Theme tokens (CSS variables)  
- Type-safe values via `InferFormValues`  
- Zod schema generation  
- Conversational variant  
- Endpoint submissions  
- Minimal API  
- React + Next.js support  
- Extendable component system  
- Built-in UI  

### Supported field types

`text`, `email`, `password`, `number`, `tel`, `url`, `date`, `textarea`, `select`, and `checkbox`.

---

## 📥 Collect Responses

No backend? Add `endpoint` and every valid submit is POSTed as JSON — no server
actions, no wiring:

```jsx
<KiForm
  fields={fields}
  endpoint="https://script.google.com/macros/s/…/exec"
  submitLabel="Sign up"
/>
```

- Payload: `{ values, meta }` — `meta` carries `submittedAt`, `pageUrl`, `referrer`, `userAgent`.
- Built-in pending/success/error status line (fully re-labelable, or hide it with `hideSubmitStatus`).
- Works with **Formspree, Web3Forms, Basin, Discord/automation webhooks** — anything that accepts a JSON POST.
- **Google Sheets with zero code**: the Schema Studio generates an Apps Script — paste it into your Sheet once, connect the `/exec` URL, and every submission lands as a row. (Apps Script can't answer CORS preflights, so ki-forms automatically sends those endpoints as `text/plain` — no config needed.)
- `onSubmit` still fires as before; `onSubmitted(result)` reports the request outcome.

New props: `endpoint`, `method` (default `POST`), `headers`, `submitLabel`, `submittingLabel`, `successLabel`, `errorLabel`, `hideSubmitStatus`, `onSubmitted`.

> ⚠️ **Security boundary** — the endpoint URL is public (submissions happen in
> the browser) and must never contain secrets. For private webhooks or API keys,
> submit to your own server and let the server forward the request.

---

## 🤖 AI Generation (BYOK)

Describe the form in the Studio AI panel, review the proposed schema, then
apply it to the canvas. Any OpenAI-compatible `/chat/completions` endpoint
works (defaults: `https://api.openai.com/v1`, model `gpt-4o-mini`).

- The key lives in `sessionStorage` only — never the document, localStorage,
  or share links. Requests go straight from your browser to the provider.
- Model output is validated with the canonical importer — failures show
  path-specific errors and nothing is applied.
- Applying over a non-empty canvas asks for confirmation.

---

## 🎨 Custom CSS (Scoped)

Write document-level CSS in the Studio Style panel. The canvas and Preview
render it scoped under `[data-ki-preview="studio"]`, so Studio chrome is
untouched. The ki-forms runtime never injects CSS.

- Export via Code → CSS (copy or download `form.css`) and own it in your app
  stylesheet.
- Guards: 20,000-character cap; `</style>`, `</script>`, and HTML comments
  are rejected, never applied. Imports carry custom CSS with the document.

---

## 📐 Formal JSON Schema

A draft-07 schema ships as `ki-forms/schema.json` and mirrors the canonical
TypeScript validator (which stays canonical for edge cases like duplicate
names and regex compilability):

```json
{
  "$schema": "ki-forms/schema.json",
  "version": 1,
  "fields": [
    { "name": "email", "type": "email", "required": true }
  ]
}
```

Add `"$schema": "ki-forms/schema.json"` at the document top level for editor
autocomplete and LLM output validation — imports ignore the key.

---

## ⌨️ CLI

The same package ships a CLI. Nothing extra to install, nothing global.

```bash
# Scaffold a component + portable schema (template inferred from the name)
npx ki-forms add "waitlist form"

# Templates: blank, waitlist, contact, signup, job-app, feedback
npx ki-forms add "job application" --zod --dir src/app/forms

# Preview without writing; machine-readable output for agents
npx ki-forms add "survey" --template feedback --dry-run --json
```

```
Created Waitlist (2 fields) from template "waitlist"
  src/forms/WaitlistForm.tsx
  src/forms/waitlist-form.schema.json
```

`add` writes two files: a ready-to-paste component and a portable schema
document. The component comes from the same generator the React export uses, so
CLI output and Studio output are byte-identical.

Verify and regenerate from any schema or document JSON — useful in CI, and after
an LLM edits the schema by hand:

```bash
npx ki-forms validate src/forms/waitlist-form.schema.json
npx ki-forms export src/forms/waitlist-form.schema.json \
  --component WaitlistForm --zod --out src/forms/WaitlistForm.tsx
npx ki-forms list
```

| Command | Purpose |
| --- | --- |
| `add [name]` | Scaffold a component + portable schema |
| `list` | List templates |
| `validate <file>` | Validate a schema or document, with path-specific errors |
| `export <file>` | Print or write a ready-to-paste React component |
| `share <file>` | Print a shareable Studio link (`--origin`, `--out`) |

`add` options: `--template`, `--dir`, `--component`, `--js`, `--zod`,
`--variant`, `--endpoint`, `--force`, `--dry-run`, `--json`. It refuses to
overwrite existing files without `--force`, and writes nothing on `--dry-run`.

Exit codes are script-friendly: `0` success, `1` validation or IO failure, `2`
usage error. Requires Node 20+.

---

## 🤖 MCP Server

The same package ships an MCP server, so an agent gets the *canonical*
validator and generator rather than a reimplementation of them.

```json
{
  "mcpServers": {
    "ki-forms": {
      "command": "npx",
      "args": ["-y", "ki-forms-mcp"]
    }
  }
}
```

| Tool | Purpose |
| --- | --- |
| `validate_schema` | Validate a field array or document, every issue with its path |
| `list_templates` | The template catalog |
| `scaffold_form` | A natural-language phrase → component + schema **contents** |
| `export_component` | A schema → ready-to-paste React, optionally with zod |

`scaffold_form` and `export_component` return file *contents* rather than
writing to disk. The agent already has file tools; a server that silently writes
files is a worse default and harder to compose. `ki-forms add` is the path that
writes.

The published JSON Schema is served as a resource at
`ki-forms://schema/ki-form.schema.json`, so an agent authors against the real
contract instead of guessing property names.

This is a tools subset, not a reference implementation — `initialize`,
`tools/*`, and `resources/*`. MCP is a moving target, and a focused server that
works in a real client today is worth more than a complete one that half-works.

---

## 🔗 Share Links

A share link carries a whole form in the URL *fragment*, which browsers never
send to a server. So sharing a form needs no account, no backend, and no
privacy caveat:

```text
https://kadirulislam.github.io/ki-forms/studio/#ki=v1.dZDLisJAEEV_Jdx1b9z…
#                                     └─ JSON → deflate-raw → base64url
```

In the Studio, *Copy share link* is in the overflow menu. Opening a link decodes
it, runs it through the same importer the JSON import uses, and applies it — and
asks first if the canvas already has fields.

```bash
npx ki-forms share src/forms/waitlist-form.schema.json
npx ki-forms share form.schema.json --origin https://forms.example.com/studio/
```

The encoding uses the native `CompressionStream` (Chrome 80+, Safari 16.4+,
Firefox 113+, Node 20+) — zero dependencies. A realistic form is 200–500
characters, short enough to survive a chat client, and the payload is versioned
so the format can change without breaking old links.

The codec only moves bytes and never validates: a decoded payload is `unknown`
until it passes the canonical importer, exactly like a hand-edited JSON file.

---

## ⚖️ Comparison

ki-forms is a JSON-driven React renderer — not a replacement for React Hook
Form. The closer comparisons on the renderer side are react-jsonschema-form,
SurveyJS, and Formily. React Hook Form remains the better pick for deeply
custom, application-controlled form state.

| Feature           | ki-forms | React Hook Form |
|------------------|---------|----------------|
| Setup            | Zero    | Medium         |
| Boilerplate      | Low     | Medium         |
| Dynamic forms    | Built-in | Manual        |
| Visual builder   | Built-in (Studio) | None |
| Learning curve   | Very Low | Medium        |

---

## 🗺️ Scope & Roadmap

The current core focuses on flat, JSON-serializable forms. Nested objects,
repeatable field arrays, and file uploads are intentionally deferred until they
can be designed consistently across schema, runtime, Studio, TypeScript, Zod,
export, and submission.

The priority is reliability and developer ownership — not feature parity with
larger form platforms.

---

## 🛠️ Development

```bash
npm test
npm run typecheck
npm run build
npm run docs:build
npm run studio:build
```

---

MIT licensed. Build forms visually, export real React, and keep ownership of
the implementation.
