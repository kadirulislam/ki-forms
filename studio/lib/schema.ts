import type { Field } from "../../src/types"
import { validateFields } from "../../src/schema/validate"

/**
 * Studio validation delegates to the shared canonical validator so Studio,
 * runtime, export, and docs always agree. String shorthand is a field name.
 * Returns either { ok, fields } or { ok: false, error }.
 */
export function validateSchema(raw: unknown): { ok: true; fields: Field[] } | { ok: false; error: string } {
  const result = validateFields(raw)
  if (result.success) return { ok: true, fields: result.data }
  const first = result.issues[0]
  const at = first.path.startsWith("fields[")
    ? `Field ${Number(first.path.slice(7).split("]")[0]) + 1}: `
    : ""
  return { ok: false, error: `${at}${first.message} (${first.path || "schema"})` }
}
