import { TEMPLATES } from "../codegen/templates"
import { exportReact } from "../codegen/react"
import type { Field, FieldInput, KiTheme } from "../types"

/**
 * Scaffolding decisions for `ki-forms add`, kept free of any IO so they can be
 * unit-tested directly. The generated component is produced by the same
 * `exportReact` the Studio uses, so a CLI-scaffolded form and a Studio export
 * are byte-identical.
 */

export type TemplateId = (typeof TEMPLATES)[number]["id"]

/**
 * Keywords that pick a template from a human phrase, so
 * `ki-forms add "waitlist form"` does the obvious thing. Order matters: the
 * first template with a matching keyword wins, so more specific intents
 * ("apply", "job") are listed before broader ones ("sign up").
 */
const TEMPLATE_HINTS: ReadonlyArray<readonly [TemplateId, readonly string[]]> = [
  ["job-app", ["job", "career", "hiring", "vacancy", "application", "apply", "resume", "cv"]],
  ["feedback", ["feedback", "survey", "review", "rating", "nps", "testimonial", "satisfaction"]],
  ["contact", ["contact", "support", "enquiry", "inquiry", "get in touch", "reach out", "help"]],
  ["waitlist", ["waitlist", "early access", "invite", "beta access", "notify me"]],
  ["signup", ["signup", "sign up", "sign-up", "register", "registration", "account", "login", "auth"]],
]

/** Lowercased, punctuation-free haystack for keyword matching. */
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** "waitlist form" -> "waitlist-form" (safe as both a filename and a URL slug). */
export function slugify(input: string): string {
  return normalize(input).replace(/\s+/g, "-")
}

/** "waitlist form" -> "WaitlistForm". */
export function pascalCase(input: string): string {
  const parts = normalize(input).split(" ").filter(Boolean)
  const joined = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")
  // A component name must start with a letter or underscore.
  return /^[A-Za-z]/.test(joined) ? joined : `Form${joined}`
}

/**
 * Choose a template from a free-text phrase. Returns "blank" when nothing
 * matches so `ki-forms add` always produces something valid.
 */
export function pickTemplate(phrase: string): TemplateId {
  const haystack = ` ${normalize(phrase)} `
  for (const [id, keywords] of TEMPLATE_HINTS) {
    if (keywords.some((k) => haystack.includes(` ${k} `) || haystack.includes(`${k} `))) return id
  }
  return "blank"
}

export function templateById(id: string): (typeof TEMPLATES)[number] | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export type AddOptions = {
  /** Free-text form name, e.g. "waitlist form". */
  name: string
  template: TemplateId
  component: string
  dir: string
  language: "tsx" | "jsx"
  zod: boolean
  variant: "classic" | "conversational"
  endpoint?: string
  theme?: KiTheme
}

export type ResolvedTemplate = {
  id: TemplateId
  label: string
  fields: Field[]
}

/** Look up the chosen template and normalize its shorthand fields. */
export function resolveTemplate(id: string): ResolvedTemplate {
  const template = templateById(id)
  if (!template) {
    const known = TEMPLATES.map((t) => t.id).join(", ")
    throw new Error(`Unknown template "${id}". Available: ${known}`)
  }
  return {
    id: template.id,
    label: template.name,
    fields: template.fields.map((f) => (typeof f === "string" ? { name: f } : f)) as Field[],
  }
}

export type ResolvedAdd = Omit<AddOptions, "template"> & {
  slug: string
  componentFile: string
  schemaFile: string
  extension: string
  /** The template id is replaced by its resolved, normalized definition. */
  template: ResolvedTemplate
}

export function resolveAdd(options: AddOptions): ResolvedAdd {
  const slug = slugify(options.name)
  if (!slug) throw new Error('Form name must contain at least one letter or number, e.g. "waitlist form"')
  const extension = options.language === "tsx" ? ".tsx" : ".jsx"
  const base = `${slug}.schema.json`
  return {
    ...options,
    slug,
    extension,
    template: resolveTemplate(options.template),
    componentFile: `${options.component}${extension}`,
    schemaFile: base,
  }
}

/**
 * The portable schema document. `$schema` is ignored by Studio imports but
 * gives editors autocomplete and validation against the published spec.
 */
export function renderSchemaDocument(resolved: ResolvedAdd): string {
  const document: Record<string, unknown> = {
    $schema: "ki-forms/schema.json",
    version: 1,
    name: resolved.name,
    fields: resolved.template.fields,
    variant: resolved.variant,
  }
  if (resolved.endpoint) document.endpoint = resolved.endpoint
  if (resolved.theme && Object.keys(resolved.theme).length > 0) document.theme = resolved.theme
  return `${JSON.stringify(document, null, 2)}\n`
}

/** The ready-to-paste component, identical to the Studio's React export. */
export function renderComponent(resolved: ResolvedAdd): { code: string; warnings: string[] } {
  const result = exportReact(resolved.component, resolved.template.fields, {
    language: resolved.language,
    validation: resolved.zod ? "zod" : "none",
    variant: resolved.variant,
    endpoint: resolved.endpoint,
    theme: resolved.theme,
  })
  return { code: result.code, warnings: result.warnings.map((w) => `${w.field}: ${w.message}`) }
}

export type GeneratedFile = { path: string; contents: string; kind: "component" | "schema" }

export type ScaffoldResult = {
  files: GeneratedFile[]
  /** Non-fatal export notes (e.g. `onChange` callbacks cannot live in portable JSON). */
  warnings: string[]
}

export function generateFiles(resolved: ResolvedAdd, dir: string): ScaffoldResult {
  const component = renderComponent(resolved)
  return {
    files: [
      { path: `${dir}/${resolved.componentFile}`, contents: component.code, kind: "component" },
      { path: `${dir}/${resolved.schemaFile}`, contents: renderSchemaDocument(resolved), kind: "schema" },
    ],
    warnings: component.warnings,
  }
}

export type { FieldInput }
