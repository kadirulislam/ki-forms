import type { Field } from "../../src/types"

const FIELD_TYPES: readonly string[] = [
  "text",
  "email",
  "password",
  "select",
  "checkbox",
  "number",
  "textarea",
]

/**
 * Validate an unknown parsed JSON value as a ki-forms schema (array of fields).
 * Studio rules are stricter than the runtime library on purpose: the studio
 * produces schemas, so it should refuse to emit ones the renderer would reject.
 * Returns either { ok, fields } or { ok: false, error }.
 */
export function validateSchema(raw: unknown): { ok: true; fields: Field[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Schema must be an array of fields" }
  }

  const seen = new Set<string>()

  for (let i = 0; i < raw.length; i++) {
    const item: unknown = raw[i]
    const at = `Field ${i + 1}`

    if (typeof item === "string") {
      // String shorthand: must be a known field type (2.0.0 semantics)
      if (!FIELD_TYPES.includes(item)) {
        return { ok: false, error: `${at}: "${item}" is not a valid field type` }
      }
      continue
    }

    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: `${at}: every field must be a string or an object` }
    }

    const f = item as Record<string, unknown>

    if (typeof f.name !== "string" || f.name.trim() === "") {
      return { ok: false, error: `${at}: missing required "name" (non-empty string)` }
    }
    if (seen.has(f.name)) {
      return { ok: false, error: `${at}: duplicate field name "${f.name}"` }
    }
    seen.add(f.name)

    if (f.type !== undefined && !FIELD_TYPES.includes(f.type as string)) {
      return { ok: false, error: `${at}: unknown type "${String(f.type)}"` }
    }
    if (f.label !== undefined && f.label !== false && typeof f.label !== "string") {
      return { ok: false, error: `${at}: "label" must be a string or false` }
    }
    if (f.placeholder !== undefined && typeof f.placeholder !== "string") {
      return { ok: false, error: `${at}: "placeholder" must be a string` }
    }
    if (f.required !== undefined && typeof f.required !== "boolean") {
      return { ok: false, error: `${at}: "required" must be true or false` }
    }
    if (f.helperText !== undefined && typeof f.helperText !== "string") {
      return { ok: false, error: `${at}: "helperText" must be a string` }
    }
    if (f.options !== undefined) {
      if (
        !Array.isArray(f.options) ||
        f.options.length === 0 ||
        !f.options.every((o: unknown) => typeof o === "string" || (o !== null && typeof o === "object" && typeof (o as { label?: unknown }).label === "string" && typeof (o as { value?: unknown }).value === "string"))
      ) {
        return { ok: false, error: `${at}: "options" must be a non-empty array of strings or { label, value }` }
      }
    }
    if (f.showIf !== undefined) {
      const si = f.showIf
      if (si === null || typeof si !== "object" || Array.isArray(si)) {
        return { ok: false, error: `${at}: "showIf" must be an object` }
      }
      const s = si as Record<string, unknown>
      const isCond = (c: unknown) =>
        c !== null && typeof c === "object" && typeof (c as { field?: unknown }).field === "string" &&
        ((c as { equals?: unknown }).equals !== undefined || (c as { notEquals?: unknown }).notEquals !== undefined)
      const hasSingle = typeof s.field === "string" && (s.equals !== undefined || s.notEquals !== undefined)
      const hasAll = Array.isArray(s.all) && s.all.length > 0 && s.all.every(isCond)
      const hasAny = Array.isArray(s.any) && s.any.length > 0 && s.any.every(isCond)
      const hasGroups = s.all !== undefined || s.any !== undefined
      if (!hasSingle && !hasAll && !hasAny) {
        return {
          ok: false,
          error: `${at}: "showIf" needs { field, equals/notEquals }, or non-empty all/any arrays of { field, equals/notEquals }`,
        }
      }
      // A group plus a top-level single condition is allowed (combined with AND)
      if (hasGroups && hasSingle) {
        return { ok: false, error: `${at}: "showIf" cannot mix a top-level condition with all/any groups` }
      }
    }
  }

  return { ok: true, fields: raw as Field[] }
}
