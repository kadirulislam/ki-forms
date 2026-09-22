import type { Field } from "../../src/types"

function literal(value: unknown): string {
  return JSON.stringify(value)
}

export function toJson(fields: Field[]): string {
  return JSON.stringify(fields, null, 2)
}

function optionsLiteral(options: NonNullable<Field["options"]>): string {
  return options.every((option) => typeof option === "string")
    ? `[${options.map((option) => literal(option)).join(", ")}]`
    : JSON.stringify(options)
}

function conditionLiteral(condition: Record<string, unknown>): string {
  const parts: string[] = []
  if (condition.field !== undefined) parts.push(`field: ${literal(condition.field)}`)
  if (condition.equals !== undefined) parts.push(`equals: ${literal(condition.equals)}`)
  if (condition.notEquals !== undefined) parts.push(`notEquals: ${literal(condition.notEquals)}`)
  return `{ ${parts.join(", ")} }`
}

function showIfLiteral(field: Field): string {
  const showIf = field.showIf as Record<string, unknown>
  if (Array.isArray(showIf.all)) return `showIf: { all: [${showIf.all.map((item) => conditionLiteral(item as Record<string, unknown>)).join(", ")}] }`
  if (Array.isArray(showIf.any)) return `showIf: { any: [${showIf.any.map((item) => conditionLiteral(item as Record<string, unknown>)).join(", ")}] }`
  return `showIf: ${conditionLiteral(showIf)}`
}

function fieldLiteral(field: Field, warnings: ExportWarning[]): string {
  if (typeof field === "string") return `  ${literal(field)},`
  if (field.onChange !== undefined) {
    warnings.push({ field: field.name, message: "onChange is application code and was not exported; wire it up in the generated component." })
  }
  const isBareText = field.type === "text" && field.label === undefined && field.placeholder === undefined && field.options === undefined && field.defaultValue === undefined && !field.required && field.helperText === undefined && field.className === undefined && field.showIf === undefined
  if (isBareText) return `  ${literal(field.name)},`
  const parts = [`name: ${literal(field.name)}`]
  if (field.type) parts.push(`type: ${literal(field.type)}`)
  if (field.label !== undefined) parts.push(`label: ${literal(field.label)}`)
  if (field.placeholder !== undefined) parts.push(`placeholder: ${literal(field.placeholder)}`)
  if (field.options !== undefined) parts.push(`options: ${optionsLiteral(field.options)}`)
  if (field.defaultValue !== undefined) parts.push(`defaultValue: ${literal(field.defaultValue)}`)
  if (field.required) parts.push("required: true")
  if (field.minLength !== undefined) parts.push(`minLength: ${literal(field.minLength)}`)
  if (field.maxLength !== undefined) parts.push(`maxLength: ${literal(field.maxLength)}`)
  if (field.pattern !== undefined) parts.push(`pattern: ${literal(field.pattern)}`)
  if (field.min !== undefined) parts.push(`min: ${literal(field.min)}`)
  if (field.max !== undefined) parts.push(`max: ${literal(field.max)}`)
  if (field.helperText !== undefined) parts.push(`helperText: ${literal(field.helperText)}`)
  if (field.className !== undefined) parts.push(`className: ${literal(field.className)}`)
  if (field.showIf) parts.push(showIfLiteral(field))
  return `  { ${parts.join(", ")} },`
}

export function fieldSummary(field: Field): string {
  const type = field.type || "text"
  if (type === "select") return `${type} · ${Array.isArray(field.options) ? field.options.length : 0} options`
  return type
}

export type SnippetOptions = {
  theme?: Record<string, string>
  variant?: "classic" | "conversational"
  endpoint?: string
  onSubmitBody?: string
  language?: "tsx" | "jsx"
  /** Emit a readable Zod schema alongside the component (code-first friendly). */
  validation?: "none" | "zod"
}

export type ExportWarning = { field: string; message: string }
export type ExportResult = { code: string; warnings: ExportWarning[] }

function themeLiteral(theme: Record<string, string>): string {
  return `theme={{\n${Object.entries(theme).map(([key, value]) => `        ${key}: ${literal(value)},`).join("\n")}\n      }}`
}

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

function valueAccess(name: string): string {
  return isValidIdentifier(name) ? `values.${name}` : `values[${literal(name)}]`
}

function conditionSource(showIf: NonNullable<Field["showIf"]>): string {
  const parts: string[] = []
  if (showIf.field) {
    const access = valueAccess(showIf.field)
    if (showIf.equals !== undefined) parts.push(`${access} === ${literal(showIf.equals)}`)
    else if (showIf.notEquals !== undefined) parts.push(`${access} !== ${literal(showIf.notEquals)}`)
  }
  const group = (conditions: { field: string; equals?: unknown; notEquals?: unknown }[], joiner: string) => {
    const inner = conditions.map((c) => {
      const access = valueAccess(c.field)
      if (c.equals !== undefined) return `${access} === ${literal(c.equals)}`
      return `${access} !== ${literal(c.notEquals)}`
    })
    const joined = inner.join(` ${joiner} `)
    return inner.length > 1 ? `(${joined})` : joined
  }
  if (showIf.all) parts.push(group(showIf.all, "&&"))
  if (showIf.any) parts.push(group(showIf.any, "||"))
  const joined = parts.join(" && ")
  return parts.length > 1 ? `(${joined})` : joined
}

function emptyCheckSource(field: Field): string {
  const access = valueAccess(field.name)
  if (field.type === "checkbox") return `${access} !== true`
  if (field.type === "number") return `${access} === "" || ${access} == null || Number.isNaN(${access})`
  return `${access} == null || String(${access}).trim() === ""`
}

function labelOf(field: Field): string {
  return typeof field.label === "string" ? field.label : field.name
}

/**
 * Constraint refinements mirroring `withConstraints` in src/zod.ts:
 * empty values pass, non-empty values must satisfy each set constraint.
 */
function constraintSource(field: Field): string {
  const label = labelOf(field)
  let out = ""
  const skipEmpty = (check: string, message: string) => {
    out += `.refine((v) => v === undefined || v === "" || (${check}), { message: ${literal(message)} })`
  }
  if (field.minLength !== undefined) {
    skipEmpty(`typeof v === "string" && v.length >= ${literal(field.minLength)}`, `${label} must be at least ${field.minLength} characters`)
  }
  if (field.maxLength !== undefined) {
    skipEmpty(`typeof v === "string" && v.length <= ${literal(field.maxLength)}`, `${label} must be at most ${field.maxLength} characters`)
  }
  if (field.pattern !== undefined) {
    skipEmpty(
      `(() => { try { return typeof v === "string" && new RegExp(${literal(field.pattern)}).test(v) } catch { return true } })()`,
      `${label} format is invalid`,
    )
  }
  if (field.min !== undefined) {
    skipEmpty(`typeof v === "number" && !Number.isNaN(v) && v >= ${literal(field.min)}`, `${label} must be at least ${field.min}`)
  }
  if (field.max !== undefined) {
    skipEmpty(`typeof v === "number" && !Number.isNaN(v) && v <= ${literal(field.max)}`, `${label} must be at most ${field.max}`)
  }
  return out
}

/**
 * Generate a readable `z.object(...)` source expression from fields.
 * Conditional requiredness comes from `showIf` + `required` — the same
 * source of truth as the runtime and `buildZodSchema`.
 */
export function buildZodSource(fields: Field[]): string {
  // String shorthand is a field name with default text semantics — never dropped.
  const normalized: Exclude<Field, string>[] = fields.map((f) => (typeof f === "string" ? { name: f } : f))
  const shape = normalized
    .map((field) => {
      let base: string
      if (field.type === "number") base = "z.number()"
      else if (field.type === "checkbox") base = "z.boolean()"
      else base = "z.string()"
      if (field.type === "email") base += `.email("Enter a valid email")`
      if (field.required && !field.showIf) {
        if (field.type === "checkbox") base += `.refine((v) => v === true, { message: ${literal(`${labelOf(field)} must be checked`)} })`
        else if (field.type === "number") base += `.refine((v) => typeof v === "number" && !Number.isNaN(v), { message: ${literal(`${labelOf(field)} is required`)} })`
        else base += `.min(1, ${literal(`${labelOf(field)} is required`)})`
      } else {
        base += ".optional()"
      }
      base += constraintSource(field)
      return `  ${field.name}: ${base},`
    })
    .join("\n")

  const conditional = normalized.filter((f) => !!f.required && !!f.showIf)
  const refinements = conditional
    .map((field) => {
      const cond = conditionSource(field.showIf as NonNullable<Field["showIf"]>)
      const empty = emptyCheckSource(field)
      const message = literal(`${labelOf(field)} is required`)
      const path = literal(field.name)
      return `  if (${cond}) {\n    if (${empty}) {\n      ctx.addIssue({ code: "custom", message: ${message}, path: [${path}] });\n    }\n  }`
    })
    .join("\n")

  const object = `z.object({\n${shape}\n})`
  if (!refinements) return object
  return `${object}.superRefine((values, ctx) => {\n${refinements}\n})`
}

export function exportReact(componentName: string, fields: Field[], options?: SnippetOptions): ExportResult {
  const warnings: ExportWarning[] = []
  const lines = fields.map((field) => fieldLiteral(field, warnings)).join("\n")
  const isTsx = options?.language === "tsx"
  const withZod = options?.validation === "zod"
  const zodImport = withZod ? `\nimport { z } from "zod"` : ""
  const typedImport = isTsx && !withZod ? `\nimport type { InferFormValues } from "ki-forms"` : ""
  const schemaDecl = withZod ? `\n\nconst schema = ${buildZodSource(fields)}` : ""
  const typedDeclaration = withZod
    ? isTsx ? "\n\ntype FormValues = z.infer<typeof schema>" : ""
    : isTsx ? "\ntype FormValues = InferFormValues<typeof fields>" : ""
  const schemaProp = withZod ? `\n      schema={schema}` : ""
  const variant = options?.variant === "conversational" ? `\n      variant="conversational"` : ""
  const theme = options?.theme && Object.keys(options.theme).length > 0 ? `\n      ${themeLiteral(options.theme)}` : ""
  const endpoint = options?.endpoint ? `\n      endpoint=${literal(options.endpoint)}` : ""
  const submitBody = options?.onSubmitBody ?? (options?.endpoint ? "// handled by endpoint" : "console.log(values)")
  const submit = options?.endpoint && !options.onSubmitBody
    ? ""
    : `\n      onSubmit={(values${isTsx ? ": FormValues" : ""}) => {\n        ${submitBody}\n      }}`

  const code = [
    `import { KiForm } from "ki-forms"${typedImport}${zodImport}`,
    `import "ki-forms/styles.css"`,
    "",
    "const fields = [",
    lines,
    `] as const${schemaDecl}${typedDeclaration}`,
    "",
    `export default function ${componentName}() {`,
    "  return (",
    `    <KiForm${variant}${endpoint}`,
    `      fields={fields}${schemaProp}${theme}${submit}`,
    "    />",
    "  )",
    "}",
    "",
  ].join("\n")
  return { code, warnings }
}

export function toReactSnippet(componentName: string, fields: Field[], options?: SnippetOptions): string {
  return exportReact(componentName, fields, options).code
}

/** Deterministic schema marker for code -> Studio round-trip. */
export const SCHEMA_START = "/* ki-forms:schema:start */"
export const SCHEMA_END = "/* ki-forms:schema:end */"

export function toRoundTripSnippet(componentName: string, fields: Field[], options?: SnippetOptions): string {
  const result = exportReact(componentName, fields, options)
  const schemaBlock = [SCHEMA_START, toJson(fields), SCHEMA_END].join("\n")
  return `${schemaBlock}\n\n${result.code}`
}

export function importSchemaBlock(code: string): Field[] | null {
  const start = code.indexOf(SCHEMA_START)
  const end = code.indexOf(SCHEMA_END)
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(code.slice(start + SCHEMA_START.length, end))
    if (!Array.isArray(parsed)) return null
    return parsed as Field[]
  } catch {
    return null
  }
}
