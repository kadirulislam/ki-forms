import type { Field, FieldMessages } from "../types"

/**
 * Validation message resolution (2.5.0).
 *
 * Messages are plain strings rather than functions so they stay portable JSON —
 * the same reason `onChange` is rejected by the schema validator. A caller who
 * needs the limit interpolated can write the full sentence themselves.
 */

function labelOf(field: Field): string {
  return typeof field.label === "string" ? field.label : field.name
}

function override(field: Field, key: keyof FieldMessages): string | undefined {
  const value = field.messages?.[key]
  return typeof value === "string" && value !== "" ? value : undefined
}

/** "Email is required", unless the field overrides it. */
export function requiredMessage(field: Field): string {
  return override(field, "required") ?? `${labelOf(field)} is required`
}

/**
 * Constraint messages (length / pattern / range). Empty values are skipped —
 * `required` owns emptiness — and hidden fields never reach here.
 */
export function constraintMessage(field: Field, value: unknown): string | undefined {
  const label = labelOf(field)

  if (typeof value === "string" && value !== "") {
    if (field.minLength !== undefined && value.length < field.minLength) {
      return override(field, "minLength") ?? `${label} must be at least ${field.minLength} characters`
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return override(field, "maxLength") ?? `${label} must be at most ${field.maxLength} characters`
    }
    if (field.pattern !== undefined) {
      try {
        if (!new RegExp(field.pattern).test(value)) {
          return override(field, "pattern") ?? `${label} format is invalid`
        }
      } catch {
        // Invalid patterns are rejected by the schema validator; never crash here.
      }
    }
    return undefined
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    if (field.min !== undefined && value < field.min) {
      return override(field, "min") ?? `${label} must be at least ${field.min}`
    }
    if (field.max !== undefined && value > field.max) {
      return override(field, "max") ?? `${label} must be at most ${field.max}`
    }
    return undefined
  }

  return undefined
}
