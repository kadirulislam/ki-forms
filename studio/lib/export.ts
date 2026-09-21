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
}

export type ExportWarning = { field: string; message: string }
export type ExportResult = { code: string; warnings: ExportWarning[] }

function themeLiteral(theme: Record<string, string>): string {
  return `theme={{\n${Object.entries(theme).map(([key, value]) => `        ${key}: ${literal(value)},`).join("\n")}\n      }}`
}

export function exportReact(componentName: string, fields: Field[], options?: SnippetOptions): ExportResult {
  const warnings: ExportWarning[] = []
  const lines = fields.map((field) => fieldLiteral(field, warnings)).join("\n")
  const isTsx = options?.language === "tsx"
  const typedImport = isTsx ? `\nimport type { InferFormValues } from "ki-forms"` : ""
  const typedDeclaration = isTsx ? "\ntype FormValues = InferFormValues<typeof fields>" : ""
  const variant = options?.variant === "conversational" ? `\n      variant="conversational"` : ""
  const theme = options?.theme && Object.keys(options.theme).length > 0 ? `\n      ${themeLiteral(options.theme)}` : ""
  const endpoint = options?.endpoint ? `\n      endpoint=${literal(options.endpoint)}` : ""
  const submitBody = options?.onSubmitBody ?? (options?.endpoint ? "// handled by endpoint" : "console.log(values)")
  const submit = options?.endpoint && !options.onSubmitBody
    ? ""
    : `\n      onSubmit={(values${isTsx ? ": FormValues" : ""}) => {\n        ${submitBody}\n      }}`

  const code = [
    `import { KiForm } from "ki-forms"${typedImport}`,
    `import "ki-forms/styles.css"`,
    "",
    "const fields = [",
    lines,
    `] as const${typedDeclaration}`,
    "",
    `export default function ${componentName}() {`,
    "  return (",
    `    <KiForm${variant}${endpoint}`,
    `      fields={fields}${theme}${submit}`,
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
