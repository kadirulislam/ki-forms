import { TEMPLATES } from "../codegen/templates"
import { generateFiles, pascalCase, pickTemplate, resolveAdd, slugify, type AddOptions } from "../cli/scaffold"
import { exportReact } from "../codegen/react"
import { validateDocument, validateFields } from "../schema/validate"
import type { Field, FieldInput, KiFormSchema, KiTheme } from "../types"

/**
 * MCP tool surface (2.5.0).
 *
 * Every tool is a thin shim over a function that already exists and is already
 * tested, so the server cannot drift from the library. `validate_schema` returns
 * the *same* `validateDocument` result the Studio and CLI use — that identity is
 * asserted in tests/cli-mcp.test.ts, and it is the whole argument for shipping
 * this: an agent gets the canonical validator, not a reimplementation.
 *
 * Tools return file *contents* rather than writing to disk. The agent already
 * has file tools, and a server that silently writes files is both a worse
 * default and harder to compose. `ki-forms add` remains the path that writes.
 */

export type ToolResult = {
  content: { type: "text"; text: string }[]
  isError?: boolean
}

function text(value: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] }
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true }
}

/** Accept either a JSON string or an already-parsed object. */
function asJson(value: unknown, label: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: false, error: `"${label}" is required.` }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed === "") return { ok: false, error: `"${label}" is empty.` }
    try {
      return { ok: true, value: JSON.parse(trimmed) }
    } catch (error) {
      return { ok: false, error: `"${label}" is not valid JSON: ${(error as Error).message}` }
    }
  }
  return { ok: true, value }
}

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key]
  return typeof v === "string" && v !== "" ? v : undefined
}

function bool(args: Record<string, unknown>, key: string): boolean {
  return args[key] === true
}

// ---------------------------------------------------------------- validate

export function toolValidateSchema(args: Record<string, unknown>): ToolResult {
  const parsed = asJson(args.schema ?? args.fields ?? args.document, "schema")
  if (!parsed.ok) return fail(parsed.error)

  // Mirrors the Studio importer: a bare array is a field list, an object is a
  // full document. Anything else is a real error, never a silent fallback.
  if (Array.isArray(parsed.value)) {
    const result = validateFields(parsed.value)
    if (result.success) {
      return text({ valid: true, fieldCount: result.data.length, issues: [] })
    }
    return text({ valid: false, issues: result.issues })
  }
  if (!parsed.value || typeof parsed.value !== "object") {
    return text({ valid: false, issues: [{ path: "", message: "Expected a field array or a document object" }] })
  }
  const result = validateDocument(parsed.value)
  if (result.success) {
    return text({ valid: true, fieldCount: result.data.fields.length, issues: [] })
  }
  return text({ valid: false, issues: result.issues })
}

// ---------------------------------------------------------------- templates

export function toolListTemplates(): ToolResult {
  return text({
    templates: TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      fieldCount: t.fields.length,
    })),
  })
}

// ---------------------------------------------------------------- scaffold

export function toolScaffoldForm(args: Record<string, unknown>): ToolResult {
  const name = str(args, "name")
  if (!name) return fail('"name" is required, e.g. "waitlist form".')

  const variant = str(args, "variant")
  if (variant && variant !== "classic" && variant !== "conversational") {
    return fail('"variant" must be "classic" or "conversational".')
  }
  const endpoint = str(args, "endpoint")
  if (endpoint && !/^https?:\/\//.test(endpoint)) {
    return fail('"endpoint" must be an http(s) URL.')
  }

  const template = str(args, "template") ?? pickTemplate(name)

  let resolved
  try {
    const options: AddOptions = {
      name,
      template: template as AddOptions["template"],
      // Same fallback the CLI uses, so `scaffold_form` and `ki-forms add`
      // produce identical filenames.
      component: str(args, "component") ?? pascalCase(slugify(name)),
      dir: ".",
      language: bool(args, "js") ? "jsx" : "tsx",
      zod: bool(args, "zod"),
      variant: (variant as "classic" | "conversational") ?? "classic",
      endpoint,
    }
    resolved = resolveAdd(options)
  } catch (error) {
    return fail((error as Error).message)
  }

  const dir = str(args, "dir") ?? "."
  const result = generateFiles(resolved, dir)
  return text({
    template: resolved.template.id,
    templateName: resolved.template.label,
    component: resolved.component,
    // Contents, not writes: the caller decides where these go.
    files: result.files.map((f) => ({ path: f.path, kind: f.kind, contents: f.contents })),
    warnings: result.warnings,
    next: `Write the files, then npm install ki-forms and render <${resolved.component} />.`,
  })
}

// ---------------------------------------------------------------- export

export function toolExportComponent(args: Record<string, unknown>): ToolResult {
  const parsed = asJson(args.schema ?? args.fields ?? args.document, "schema")
  if (!parsed.ok) return fail(parsed.error)

  let fields: Field[]
  let theme: KiTheme = {}
  let variant: "classic" | "conversational" = "classic"
  let endpoint: string | undefined

  if (Array.isArray(parsed.value)) {
    const result = validateFields(parsed.value)
    if (!result.success) {
      return text({ ok: false, issues: result.issues, hint: "Fix the schema, or call validate_schema for the full list." })
    }
    fields = result.data as Field[]
  } else if (parsed.value && typeof parsed.value === "object") {
    const result = validateDocument(parsed.value)
    if (!result.success) {
      return text({ ok: false, issues: result.issues, hint: "Fix the schema, or call validate_schema for the full list." })
    }
    fields = result.data.fields as Field[]
    theme = (result.data.theme ?? {}) as KiTheme
    variant = result.data.variant ?? "classic"
    endpoint = result.data.endpoint
  } else {
    return fail("Expected a field array or a document object.")
  }

  const variantArg = str(args, "variant")
  if (variantArg && variantArg !== "classic" && variantArg !== "conversational") {
    return fail('"variant" must be "classic" or "conversational".')
  }

  const out = exportReact(str(args, "component") ?? "MyForm", fields, {
    language: bool(args, "js") ? "jsx" : "tsx",
    validation: bool(args, "zod") ? "zod" : "none",
    variant: (variantArg as "classic" | "conversational") ?? variant,
    endpoint: str(args, "endpoint") ?? endpoint,
    theme,
  })

  return text({
    code: out.code,
    warnings: out.warnings.map((w) => ({ field: w.field, message: w.message })),
  })
}

// ---------------------------------------------------------------- resources

/**
 * The published JSON Schema, so an agent authors against the real contract
 * instead of guessing property names. Kept in sync by the Ajv parity test.
 */
export const SCHEMA_RESOURCE_URI = "ki-forms://schema/ki-form.schema.json"

export function readSchemaResource(): { uri: string; mimeType: string; text: string } | null {
  // Inlined at build time by tsup.cli.config.ts; absent when running from source.
  const text = typeof __KI_FORM_SCHEMA_JSON__ === "string" ? __KI_FORM_SCHEMA_JSON__ : null
  if (!text) return null
  return { uri: SCHEMA_RESOURCE_URI, mimeType: "application/schema+json", text }
}

declare const __KI_FORM_SCHEMA_JSON__: string | undefined

// ---------------------------------------------------------------- registry

export type ToolDefinition = {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "validate_schema",
    description:
      "Validate a ki-forms field array or document against the canonical validator. Returns every issue with its path. " +
      "Call this before writing a schema so the form is correct the first time.",
    inputSchema: {
      type: "object",
      properties: {
        schema: {
          description: "A field array or a full document, as a JSON string or an object.",
          anyOf: [{ type: "string" }, { type: "object" }, { type: "array" }],
        },
      },
      required: ["schema"],
    },
  },
  {
    name: "list_templates",
    description: "List the premade form templates with their ids, descriptions, and field counts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "scaffold_form",
    description:
      "Scaffold a ki-forms form from a natural-language phrase, e.g. 'waitlist form'. Infers a template from the phrase " +
      "unless one is named. Returns the component and schema file CONTENTS — nothing is written to disk.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "What the form is for, e.g. 'job application'." },
        template: { type: "string", description: "blank | waitlist | contact | signup | job-app | feedback" },
        component: { type: "string", description: "Component name. Defaults to a PascalCase form of `name`." },
        dir: { type: "string", description: "Directory prefix for the returned paths." },
        zod: { type: "boolean", description: "Include a zod schema and z.infer type." },
        js: { type: "boolean", description: "Emit .jsx instead of .tsx." },
        variant: { type: "string", enum: ["classic", "conversational"] },
        endpoint: { type: "string", description: "http(s) URL to POST submissions to." },
      },
      required: ["name"],
    },
  },
  {
    name: "export_component",
    description:
      "Turn a ki-forms schema into a ready-to-paste React component, optionally with a readable zod schema. The same " +
      "generator the Schema Studio uses, so output is byte-identical to a Studio export.",
    inputSchema: {
      type: "object",
      properties: {
        schema: { description: "A field array or a full document.", anyOf: [{ type: "string" }, { type: "object" }, { type: "array" }] },
        component: { type: "string", description: "Component name. Default: MyForm." },
        zod: { type: "boolean", description: "Include a zod schema and z.infer type." },
        js: { type: "boolean", description: "Emit JSX instead of TSX." },
        variant: { type: "string", enum: ["classic", "conversational"] },
        endpoint: { type: "string", description: "Overrides any endpoint in the document." },
      },
      required: ["schema"],
    },
  },
]

/** Dispatch a `tools/call`. Unknown names are an error, never a silent success. */
export function callTool(name: string, args: Record<string, unknown>): ToolResult {
  switch (name) {
    case "validate_schema":
      return toolValidateSchema(args)
    case "list_templates":
      return toolListTemplates()
    case "scaffold_form":
      return toolScaffoldForm(args)
    case "export_component":
      return toolExportComponent(args)
    default:
      return fail(
        `Unknown tool "${name}". Available: ${TOOLS.map((t) => t.name).join(", ")}.`,
      )
  }
}

export type { FieldInput, KiFormSchema }
