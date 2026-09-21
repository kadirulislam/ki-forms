# ki-forms

Build forms visually, export real React, and keep ownership of the implementation.

ki-forms is a developer-first React form renderer for portable field schemas. Define a form as data, preview it in Schema Studio, export readable TypeScript or JavaScript, and keep the final code in your application.

[Documentation](https://kadirulislam.github.io/ki-forms/) · [Schema Studio](https://kadirulislam.github.io/ki-forms/studio/) · [GitHub](https://github.com/kadirulislam/ki-forms)

## The workflow

```text
Studio -> canonical schema -> TypeScript/JavaScript -> KiForm runtime
```

The same schema drives rendering, conditional logic, validation integration, Studio preview, and generated code. The Studio is an authoring tool, not a hosted form platform.

## Install

```bash
npm install ki-forms
```

```tsx
import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

const fields = [
  { name: "email", type: "email", required: true },
  { name: "role", type: "select", options: ["User", "Admin"] },
  {
    name: "company",
    showIf: { field: "role", equals: "Admin" },
    required: true,
  },
] as const

export function SignupForm() {
  return <KiForm fields={fields} onSubmit={(values) => save(values)} />
}
```

## Why ki-forms?

Use ki-forms when you want a small renderer, a visual schema authoring workflow, and generated React code that your team owns.

It is not intended to clone SurveyJS, Form.io, or RJSF. React Hook Form remains a strong choice for highly custom application-controlled form state. Larger schema platforms remain better for hosted surveys, enterprise field catalogs, and account-based form management.

## Canonical fields

Supported field types are `text`, `email`, `password`, `number`, `tel`, `url`, `date`, `textarea`, `select`, and `checkbox`.

```ts
{
  name: "email",
  type: "email",
  required: true,
  label: "Work email",
  placeholder: "you@example.com",
  helperText: "We never share your email",
}
```

String shorthand is available for simple text-like fields:

```tsx
<KiForm fields={["email", "password"]} onSubmit={save} />
```

## Conditions: one source of truth

`showIf` controls visibility and conditional validation. `required: true` means required when the field is visible. Do not repeat the condition in a separate `requiredWhen` configuration.

```ts
{
  name: "company",
  showIf: { field: "role", equals: "Admin" },
  required: true,
}
```

Groups use `all` or `any`:

```ts
{
  name: "taxId",
  showIf: {
    all: [
      { field: "country", equals: "US" },
      { field: "plan", equals: "Pro" },
    ],
  },
  required: true,
}
```

The legacy `requiredWhen` option is retained only for compatibility and is deprecated. New schemas, Studio exports, and generated code use `showIf` plus `required`.

## TypeScript

Static field definitions can infer form values:

```tsx
import type { InferFormValues } from "ki-forms"

const fields = [
  { name: "email", type: "email", required: true },
  { name: "age", type: "number" },
] as const

type Values = InferFormValues<typeof fields>

function save(values: Values) {
  values.email
  values.age
}
```

Schemas loaded from an API or database cannot create compile-time types by themselves. Validate dynamic data at the application boundary and provide an explicit type where needed.

## Zod

Use your own Zod instance through the optional adapter:

```tsx
import { buildZodSchema } from "ki-forms/zod"
import { z } from "zod"

const schema = buildZodSchema(fields, { zod: z })

<KiForm fields={fields} schema={schema} onSubmit={save} />
```

`buildZodSchema` is a convenience for config-first forms. Use a code-first Zod schema when complex refinements or maximum inference matter. Conditional requiredness is derived from each field's `showIf` and `required` properties.

## Studio and export

Schema Studio lets you add and reorder fields, edit properties, preview the real runtime, and copy schema JSON or React code. The generated code is intended to be copied into a real application and owned there.

Arbitrary callbacks such as `onChange` are application code, not portable JSON. They are not round-tripped by the Studio schema export.

## Endpoint submissions

An `endpoint` sends `{ values, meta }` from the browser:

```tsx
<KiForm fields={fields} endpoint="https://example.com/public-form-endpoint" />
```

The URL is visible to users and must not contain secrets. For private webhooks or API keys, submit to your own server and let the server forward the request. Google Apps Script, Formspree, Web3Forms, Basin, and compatible public JSON endpoints are supported.

## Styling

Import the built-in stylesheet, then override visual tokens:

```tsx
<KiForm
  fields={fields}
  theme={{ accentColor: "#4f46e5", radius: "10px", surfaceColor: "#fff" }}
/>
```

Use a field `className` for application-specific styling.

## Scope and roadmap

The current core focuses on flat, JSON-serializable forms. Nested objects, repeatable field arrays, and file uploads are intentionally deferred until they can be designed consistently across the schema, runtime, Studio, TypeScript, Zod, export, and submission layers.

## Development

```bash
npm test
npm run typecheck
npm run build
npm run docs:build
npm run studio:build
```

The project is MIT licensed.
