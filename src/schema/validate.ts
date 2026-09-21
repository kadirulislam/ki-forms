import type { Field, FieldInput, KiFormDocument, ShowIf } from "../types"

export type SchemaIssue = { path: string; message: string }
export type SchemaResult = { success: true; data: Field[] } | { success: false; issues: SchemaIssue[] }
export type DocumentResult = { success: true; data: KiFormDocument } | { success: false; issues: SchemaIssue[] }

const TYPES = new Set(["text", "email", "password", "select", "checkbox", "number", "textarea", "tel", "url", "date"])
const THEME_KEYS = new Set(["accentColor", "borderColor", "errorColor", "helperColor", "radius", "surfaceColor", "textColor", "fontFamily"])

function validCondition(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const condition = value as Record<string, unknown>
  return typeof condition.field === "string" &&
    ((condition.equals !== undefined) !== (condition.notEquals !== undefined))
}

function validShowIf(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const showIf = value as Record<string, unknown>
  // Canonical: single condition AND-combines with all/any groups.
  const hasSingleKey = showIf.field !== undefined || showIf.equals !== undefined || showIf.notEquals !== undefined
  const single = !hasSingleKey || validCondition(showIf)
  if (!single) return false
  if (showIf.all !== undefined && !(Array.isArray(showIf.all) && showIf.all.length > 0 && showIf.all.every(validCondition))) return false
  if (showIf.any !== undefined && !(Array.isArray(showIf.any) && showIf.any.length > 0 && showIf.any.every(validCondition))) return false
  return hasSingleKey || showIf.all !== undefined || showIf.any !== undefined
}

function validateFieldObject(field: Record<string, unknown>, path: string, names: Set<string>, issues: SchemaIssue[]): void {
  if (typeof field.name !== "string" || field.name.trim() === "") issues.push({ path: `${path}.name`, message: "Name is required" })
  else if (names.has(field.name)) issues.push({ path: `${path}.name`, message: `Duplicate field name "${field.name}"` })
  else names.add(field.name)
  if (field.type !== undefined && (typeof field.type !== "string" || !TYPES.has(field.type))) issues.push({ path: `${path}.type`, message: "Unknown field type" })
  if (field.label !== undefined && field.label !== false && typeof field.label !== "string") issues.push({ path: `${path}.label`, message: "Label must be a string or false" })
  if (field.placeholder !== undefined && typeof field.placeholder !== "string") issues.push({ path: `${path}.placeholder`, message: "Placeholder must be a string" })
  if (field.required !== undefined && typeof field.required !== "boolean") issues.push({ path: `${path}.required`, message: "Required must be boolean" })
  if (field.helperText !== undefined && typeof field.helperText !== "string") issues.push({ path: `${path}.helperText`, message: "Helper text must be a string" })
  if (field.className !== undefined && typeof field.className !== "string") issues.push({ path: `${path}.className`, message: "className must be a string" })
  if (field.defaultValue !== undefined && (typeof field.defaultValue === "object" || typeof field.defaultValue === "function")) issues.push({ path: `${path}.defaultValue`, message: "defaultValue must be a JSON-serializable primitive" })
  if (field.showIf !== undefined && !validShowIf(field.showIf)) issues.push({ path: `${path}.showIf`, message: "Invalid condition" })
  if (field.options !== undefined && (!Array.isArray(field.options) || field.options.length === 0 || !field.options.every((option) => typeof option === "string" || (option && typeof option === "object" && typeof (option as { label?: unknown }).label === "string" && typeof (option as { value?: unknown }).value === "string")))) {
    issues.push({ path: `${path}.options`, message: "Options must be a non-empty array of strings or { label, value }" })
  }
  if (field.onChange !== undefined) issues.push({ path: `${path}.onChange`, message: "onChange callbacks are application code and cannot be stored in portable schema JSON" })
}

export function validateFields(raw: unknown): SchemaResult {
  if (!Array.isArray(raw)) return { success: false, issues: [{ path: "", message: "Schema must be an array of fields" }] }
  const issues: SchemaIssue[] = []
  const names = new Set<string>()

  raw.forEach((item, index) => {
    const path = `fields[${index}]`
    if (typeof item === "string") {
      // Canonical: string shorthand is a field name.
      if (item.trim() === "") issues.push({ path, message: "Field name must be a non-empty string" })
      else if (names.has(item)) issues.push({ path, message: `Duplicate field name "${item}"` })
      else names.add(item)
      return
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      issues.push({ path, message: "Field must be a string or object" })
      return
    }
    validateFieldObject(item as Record<string, unknown>, path, names, issues)
  })
  return issues.length ? { success: false, issues } : { success: true, data: raw as Field[] }
}

export function normalizeFields(fields: FieldInput[] | undefined): Field[] {
  return (fields ?? []).map((field) => typeof field === "string" ? { name: field } : field) as Field[]
}

export function validateDocument(raw: unknown): DocumentResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { success: false, issues: [{ path: "", message: "Document must be an object with a fields array" }] }
  }
  const doc = raw as Record<string, unknown>
  const issues: SchemaIssue[] = []
  if (doc.version !== undefined && doc.version !== 1) issues.push({ path: "version", message: "Unsupported document version" })
  const fieldsResult = validateFields(doc.fields)
  if (!fieldsResult.success) issues.push(...fieldsResult.issues)
  if (doc.theme !== undefined) {
    if (!doc.theme || typeof doc.theme !== "object" || Array.isArray(doc.theme)) issues.push({ path: "theme", message: "Theme must be an object" })
    else for (const [key, value] of Object.entries(doc.theme as Record<string, unknown>)) {
      if (!THEME_KEYS.has(key)) issues.push({ path: `theme.${key}`, message: "Unknown theme token" })
      else if (typeof value !== "string") issues.push({ path: `theme.${key}`, message: "Theme tokens must be strings" })
    }
  }
  if (doc.variant !== undefined && doc.variant !== "classic" && doc.variant !== "conversational") issues.push({ path: "variant", message: "Variant must be classic or conversational" })
  if (doc.endpoint !== undefined && (typeof doc.endpoint !== "string" || !/^https?:\/\//.test(doc.endpoint))) issues.push({ path: "endpoint", message: "Endpoint must be an http(s) URL" })
  if (issues.length) return { success: false, issues }
  if (!fieldsResult.success) return { success: false, issues: fieldsResult.issues }
  return {
    success: true,
    data: {
      version: 1,
      fields: fieldsResult.data,
      ...(typeof doc.name === "string" ? { name: doc.name } : {}),
      ...(doc.theme ? { theme: doc.theme as KiFormDocument["theme"] } : {}),
      ...(doc.variant ? { variant: doc.variant as KiFormDocument["variant"] } : {}),
      ...(doc.endpoint ? { endpoint: doc.endpoint as string } : {}),
    },
  }
}

export function normalizeDocument(input: KiFormDocument | FieldInput[] | undefined): KiFormDocument {
  if (Array.isArray(input)) return { version: 1, fields: normalizeFields(input) }
  return { version: 1, fields: normalizeFields(input?.fields), theme: input?.theme, variant: input?.variant, endpoint: input?.endpoint, ...(input?.name ? { name: input.name } : {}) }
}

export type CanonicalShowIf = ShowIf
