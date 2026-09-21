import type { Field, KiTheme } from "../../src/types"
import { validateFields, validateDocument } from "../../src/schema/validate"

/**
 * Studio validation delegates to the shared canonical validator so Studio,
 * runtime, export, and docs always agree. String shorthand is a field name.
 * Returns either { ok, fields } or { ok: false, error }.
 */
export function validateSchema(raw: unknown): { ok: true; fields: Field[] } | { ok: false; error: string } {
  const result = validateFields(raw)
  if (result.success) return { ok: true, fields: result.data }
  return { ok: false, error: formatIssue(result.issues[0].path, result.issues[0].message) }
}

function formatIssue(path: string, message: string): string {
  const at = path.startsWith("fields[")
    ? `Field ${Number(path.slice(7).split("]")[0]) + 1}: `
    : ""
  return `${at}${message} (${path || "schema"})`
}

export type DocumentImport = {
  title?: string
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  endpoint?: string
}

/**
 * Parse a Studio import: either a bare field array or a full document
 * `{ version?, name?, fields, theme?, variant?, endpoint? }`.
 * Invalid input is reported with a path-specific error and never applied.
 */
export function parseDocumentImport(raw: unknown): { ok: true; doc: DocumentImport } | { ok: false; error: string } {
  if (Array.isArray(raw)) {
    const result = validateFields(raw)
    if (!result.success) return { ok: false, error: formatIssue(result.issues[0].path, result.issues[0].message) }
    return { ok: true, doc: { fields: normalizeImport(result.data), theme: {}, variant: "classic" } }
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Import must be a field array or a document object with a fields array" }
  }
  const result = validateDocument(raw)
  if (!result.success) return { ok: false, error: formatIssue(result.issues[0].path, result.issues[0].message) }
  const input = raw as Record<string, unknown>
  const title = typeof input.name === "string" ? input.name : typeof input.title === "string" ? input.title : undefined
  return {
    ok: true,
    doc: {
      ...(title ? { title } : {}),
      fields: normalizeImport(result.data.fields),
      theme: result.data.theme ?? {},
      variant: result.data.variant ?? "classic",
      ...(result.data.endpoint ? { endpoint: result.data.endpoint } : {}),
    },
  }
}

function normalizeImport(fields: readonly (Field | string)[]): Field[] {
  return fields.map((f) => (typeof f === "string" ? { name: f } : f))
}
