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
  { route: "docs/layout", id: "layout", title: "Two-column layout", eyebrow: "Field width", description: "Pair fields side by side, collapse on mobile." },
  { route: "docs/styling", id: "styling", title: "Styling and themes", eyebrow: "Visual system", description: "Tokens and field classes." },
  { route: "docs/custom-css", id: "custom-css", title: "Custom CSS", eyebrow: "Scoped preview", description: "Style-panel CSS with scoped export." },
  { route: "docs/ai", id: "ai", title: "AI generation", eyebrow: "Bring your own key", description: "Describe the form, review the schema." },
  { route: "docs/json-schema", id: "json-schema", title: "Formal JSON Schema", eyebrow: "Editor + LLM contract", description: "$schema autocomplete and validation." },
  { route: "docs/cli", id: "cli", title: "CLI", eyebrow: "Scaffold and validate", description: "Scaffold, validate, and export from the terminal." },
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

export const CODE_CUSTOM_CSS = `[data-ki-preview="studio"] .ki-field input {
  border-radius: 10px;
}`

export const CODE_JSON_SCHEMA = `{
  "$schema": "ki-forms/schema.json",
  "version": 1,
  "fields": [
    { "name": "email", "type": "email", "required": true }
  ]
}`

export const EXAMPLE_TWO_COLUMN: FieldInput[] = [
  { name: "firstName", type: "text", label: "First name", width: "half", required: true },
  { name: "lastName", type: "text", label: "Last name", width: "half", required: true },
  { name: "email", type: "email", label: "Email", required: true },
  { name: "phone", type: "tel", label: "Phone", width: "half" },
  { name: "company", type: "text", label: "Company", width: "half" },
]

export const CODE_TWO_COLUMN = `const fields = [
  // Two consecutive width: "half" fields share one row.
  { name: "firstName", label: "First name", width: "half", required: true },
  { name: "lastName", label: "Last name", width: "half", required: true },
  { name: "email", type: "email" },
  // A half field with no partner below it stretches to full width.
  { name: "phone", type: "tel", width: "half" }
]`

export const CODE_AI_PROMPT = `A waitlist form: work email (required), company,
team size select (1-10, 11-50, 51+), and a referral
source textarea.`

export const CODE_CLI_ADD = `# Scaffold a component + portable schema
npx ki-forms add "waitlist form"

# Templates: blank, waitlist, contact, signup, job-app, feedback
npx ki-forms add "job application" --zod --dir src/app/forms

# Preview without writing, machine-readable for agents
npx ki-forms add "survey" --template feedback --dry-run --json`

export const CODE_CLI_VERIFY = `# Validate a schema or document (path-specific errors, exit 1)
npx ki-forms validate src/forms/waitlist-form.schema.json

# Regenerate the component after editing the JSON
npx ki-forms export src/forms/waitlist-form.schema.json \\
  --component WaitlistForm --zod --out src/forms/WaitlistForm.tsx

npx ki-forms list`

export const CODE_CLI_OUTPUT = `Created Waitlist (2 fields) from template "waitlist"
  src/forms/WaitlistForm.tsx
  src/forms/waitlist-form.schema.json`

export const LANDING_SCHEMA = `[
  { "name": "role", "type": "select", "options": ["User", "Admin"] },
  {
    "name": "company",
    "showIf": { "field": "role", "equals": "Admin" },
    "required": true
  }
]`

export const LANDING_REACT = `import { KiForm } from "ki-forms"
import "ki-forms/styles.css"

const fields = [
  { name: "role", type: "select", options: ["User", "Admin"] },
  {
    name: "company",
    showIf: { field: "role", equals: "Admin" },
    required: true,
  },
] as const

export function SignupForm() {
  return <KiForm fields={fields} onSubmit={save} />
}`
