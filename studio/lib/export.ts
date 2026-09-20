import type { Field } from "../../src/types"

/** Pretty-printed, copy-ready form schema JSON. */
export function toJson(fields: Field[]): string {
  return JSON.stringify(fields, null, 2)
}

function optionsLiteral(options: NonNullable<Field["options"]>): string {
  if (options.every((o) => typeof o === "string")) {
    return `["${(options as string[]).join('", "')}"]`
  }
  const rows = (options as { label: string; value: string }[])
    .map((o) => `    { label: "${o.label}", value: "${o.value}" }`)
  return `[\n${rows.join(",\n")},\n  ]`
}

function showIfLiteral(field: Field): string {
  const si = field.showIf as Record<string, unknown>
  const cond = (c: { field: string; equals?: unknown; notEquals?: unknown }) =>
    `{ field: "${c.field}", ${c.equals !== undefined ? `equals: ${JSON.stringify(c.equals)}` : `notEquals: ${JSON.stringify(c.notEquals)}`} }`

  if (Array.isArray(si.all)) {
    const parts = si.all.map((c) => cond(c as { field: string })).join(", ")
    return `showIf: { all: [${parts}] }`
  }
  if (Array.isArray(si.any)) {
    const parts = si.any.map((c) => cond(c as { field: string })).join(", ")
    return `showIf: { any: [${parts}] }`
  }
  return `showIf: ${cond(si as { field: string })}`
}

/** One-line JSON-ish summary of a field for the canvas card. */
export function fieldSummary(field: Field): string {
  const t = field.type || "text"
  if (t === "select") {
    const n = Array.isArray(field.options) ? field.options.length : 0
    return `${t} · ${n} options`
  }
  if (t === "checkbox" || t === "number" || t === "textarea") return t
  return t
}

export type SnippetOptions = {
  theme?: Record<string, string>
  variant?: "classic" | "conversational"
}

function themeLiteral(theme: Record<string, string>): string {
  const rows = Object.entries(theme)
    .map(([k, v]) => `        ${k}: "${v}"`)
    .join("\n")
  return `theme={{
${rows},
      }}`
}

/** Ready-to-paste React component using the real ki-forms API. */
export function toReactSnippet(componentName: string, fields: Field[], options?: SnippetOptions): string {
  const lines = fields
    .map((f) => {
      if (typeof f === "string") return `  "${f}",`

      // String shorthand is only safe for a bare text field: the renderer maps
      // it to a text input, and nothing else needs to be said about it.
      const isBareText =
        f.type === "text" &&
        !f.placeholder &&
        !f.options &&
        !f.required &&
        !f.helperText &&
        !f.showIf &&
        (f.label === undefined || f.label === f.name)
      if (isBareText) return `  "${f.name}",`

      const parts: string[] = [`name: "${f.name}"`]
      if (f.type) parts.push(`type: "${f.type}"`)
      if (f.label !== undefined) {
        if (f.label === false) parts.push(`label: false`)
        else if (f.label !== f.name) parts.push(`label: "${f.label}"`)
      }
      if (f.placeholder) parts.push(`placeholder: "${f.placeholder}"`)
      if (f.options) parts.push(`options: ${optionsLiteral(f.options)}`)
      if (f.required) parts.push(`required: true`)
      if (f.helperText) parts.push(`helperText: "${f.helperText}"`)
      if (f.showIf) parts.push(showIfLiteral(f))
      return `  { ${parts.join(", ")} },`
    })
    .join("\n")

  const variantLine = options?.variant === "conversational" ? '\n      variant="conversational"' : ""
  const themeLine = options?.theme && Object.keys(options.theme).length > 0 ? `\n      ${themeLiteral(options.theme)}` : ""

  return `import { KiForm } from "ki-forms"

export default function ${componentName}() {
  return (
    <KiForm${variantLine}
      fields={[
${lines}
      ]}${themeLine}
      onSubmit={(values) => {
        console.log(values)
      }}
    />
  )
}
`
}
