import type { FieldInput } from "../../src/types"

export type DocPage = {
  route: string
  id: string
  title: string
  eyebrow: string
  description: string
}

export const DOC_PAGES: DocPage[] = [
  { route: "", id: "home", title: "Build forms you own", eyebrow: "Developer-first React forms", description: "Studio to schema to React to runtime." },
  { route: "docs/getting-started", id: "getting-started", title: "Getting started", eyebrow: "First steps", description: "Install and render your first form." },
  { route: "docs/schema", id: "schema", title: "Schema reference", eyebrow: "Canonical schema", description: "Every supported field property." },
  { route: "docs/conditions", id: "conditions", title: "Conditions", eyebrow: "Single source of truth", description: "showIf controls visibility and validation." },
  { route: "docs/typescript", id: "typescript", title: "TypeScript", eyebrow: "Typed values", description: "Static inference vs runtime JSON." },
  { route: "docs/zod", id: "zod", title: "Zod validation", eyebrow: "Validation", description: "Config-first and code-first validation." },
  { route: "docs/studio", id: "studio", title: "Schema Studio", eyebrow: "Visual authoring", description: "Design visually, export code." },
  { route: "docs/export", id: "export", title: "React export", eyebrow: "Own the code", description: "Deterministic generated components." },
  { route: "docs/endpoints", id: "endpoints", title: "Endpoint submissions", eyebrow: "Collect responses", description: "Public URLs and server proxies." },
  { route: "docs/styling", id: "styling", title: "Styling and themes", eyebrow: "Visual system", description: "Tokens and field classes." },
  { route: "docs/accessibility", id: "accessibility", title: "Accessibility", eyebrow: "Inclusive forms", description: "Labels, errors, and focus." },
  { route: "docs/limitations", id: "limitations", title: "Limitations and roadmap", eyebrow: "Focused scope", description: "What is deferred and why." },
  { route: "playground", id: "playground", title: "Playground", eyebrow: "Live examples", description: "Real KiForm renders with submitted values." },
]

export const EXAMPLE_BASIC: FieldInput[] = ["email", "password"]

export const EXAMPLE_CONDITIONAL: FieldInput[] = [
  { name: "role", type: "select", options: ["User", "Admin"] },
  { name: "company", showIf: { field: "role", equals: "Admin" }, required: true },
]

export const EXAMPLE_GROUP: FieldInput[] = [
  { name: "country", type: "select", options: ["US", "CA"] },
  { name: "plan", type: "select", options: ["Free", "Pro"] },
  {
    name: "taxId",
    required: true,
    showIf: { all: [{ field: "country", equals: "US" }, { field: "plan", equals: "Pro" }] },
  },
]

export const EXAMPLE_TYPED = [
  { name: "email", type: "email", required: true },
  { name: "age", type: "number" },
] as const

export const EXAMPLE_STYLED: FieldInput[] = [
  { name: "email", type: "email", required: true },
  { name: "company", type: "text", className: "acme-input" },
]

export const CODE_QUICKSTART = `import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

export function SignupForm() {
  return <KiForm fields={["email", "password"]} onSubmit={save} />
}`

export const CODE_CANONICAL = `const fields = [
  { name: "role", type: "select", options: ["User", "Admin"] },
  {
    name: "company",
    showIf: { field: "role", equals: "Admin" },
    required: true,
  },
] as const`

export const CODE_TYPED = `import type { InferFormValues } from "ki-forms"

const fields = [
  { name: "email", type: "email", required: true },
  { name: "age", type: "number" },
] as const

type Values = InferFormValues<typeof fields>
function save(values: Values) { values.email }`

export const CODE_ZOD = `import { buildZodSchema } from "ki-forms/zod"
import { z } from "zod"

const schema = buildZodSchema(fields, { zod: z })
<KiForm fields={fields} schema={schema} onSubmit={save} />`

export const CODE_ENDPOINT = `<KiForm
  fields={fields}
  endpoint="https://example.com/public-form-endpoint"
/>`

export const CODE_THEME = `<KiForm
  fields={fields}
  theme={{ accentColor: "#4f46e5", radius: "10px" }}
/>`
