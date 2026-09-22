import type { Field, KiFormSchema } from "./types"
import { shouldShow } from "./utils/conditions"

type AnyZodSchema = KiFormSchema & { safeParse: (values: Record<string, unknown>) => { success: boolean; data?: unknown; error?: { issues?: { path: (string | number)[]; message: string }[]; errors?: { path: (string | number)[]; message: string }[] } } }

export type ZodLike = {
  string: () => unknown
  number: () => unknown
  boolean: () => unknown
  object: (shape: Record<string, unknown>) => unknown
}

/**
 * Build a Zod schema from a ki-forms field list.
 *
 * - `required: true`  -> non-empty / checked (message matches built-in errors)
 * - other fields      -> `.optional()`
 * - `requiredWhen`    -> object-level check reusing showIf semantics: the field
 *                        becomes required exactly when it would be shown.
 *
 * Pass your own `zod` instance (v3 or v4) — ki-forms stays dependency-free.
 */
type Chainable = {
  optional: () => Chainable
  email?: (message?: string) => Chainable
  min?: (length: number, message?: string) => Chainable
  refine?: (check: (value: never) => boolean, params?: { message?: string }) => Chainable
  superRefine?: (refinement: (values: Record<string, unknown>, ctx: { addIssue: (issue: { code: string; message: string; path: (string | number)[] }) => void }) => void) => Chainable
  safeParse?: (values: Record<string, unknown>) => unknown
}

export function buildZodSchema(
  fields: Field[],
  options: { zod: ZodLike; /** @deprecated use field.showIf with required:true */ requiredWhen?: Record<string, Field["showIf"]> }
): AnyZodSchema {
  const { zod, requiredWhen = {} } = options
  const shape: Record<string, unknown> = {}

  for (const field of fields) {
    let base: Chainable

    switch (field.type) {
      case "number":
        base = zod.number() as Chainable
        break
      case "checkbox":
        base = zod.boolean() as Chainable
        break
      default:
        base = zod.string() as Chainable
        if (field.type === "email" && typeof base.email === "function") {
          base = base.email("Enter a valid email") as Chainable
        }
    }

    if (field.required && !field.showIf) {
      shape[field.name] = withRequired(base, field)
    } else {
      shape[field.name] = base.optional()
    }
    shape[field.name] = withConstraints(shape[field.name] as Chainable, field)
  }

  let objectSchema = zod.object(shape) as Chainable

  const conditionalFields = fields.filter((field) => field.required && field.showIf)
  const legacyConditionalFields = Object.keys(requiredWhen)
  if ((conditionalFields.length > 0 || legacyConditionalFields.length > 0) && typeof objectSchema.superRefine === "function") {
    objectSchema = objectSchema.superRefine((values: Record<string, unknown>, ctx: { addIssue: (issue: { code: string; message: string; path: (string | number)[] }) => void }) => {
      for (const field of conditionalFields) {
        const name = field.name
        const shown = shouldShow(field, values as Record<string, string>)

        const value = values[name]
        const empty = isEmptyForZod(field, value)

        if (shown && empty) {
          ctx.addIssue({
            code: "custom",
            message: `${typeof field.label === "string" ? field.label : field.name} is required`,
            path: [name],
          })
        }
      }
      for (const name of legacyConditionalFields) {
        const field = fields.find((candidate) => candidate.name === name)
        if (!field || field.showIf) continue
        const shown = shouldShow({ ...field, showIf: requiredWhen[name] }, values as Record<string, string>)
        const value = values[name]
        const empty = isEmptyForZod(field, value)
        if (shown && empty) ctx.addIssue({ code: "custom", message: `${typeof field.label === "string" ? field.label : field.name} is required`, path: [name] })
      }
    }) as Chainable
  }

  return objectSchema as unknown as AnyZodSchema
}

function isEmptyForZod(field: Field, value: unknown): boolean {
  if (field.type === "checkbox") return value !== true
  if (field.type === "number") return value === "" || value === undefined || value === null || (typeof value === "number" && Number.isNaN(value))
  if (typeof value === "string") return value.trim() === ""
  return value === "" || value === undefined || value === null
}

function withRequired(base: Chainable, field: Field) {
  const label = typeof field.label === "string" ? field.label : field.name

  if (field.type === "checkbox") {
    return base.refine?.((v: boolean) => v === true, { message: `${label} must be checked` }) ?? base
  }
  if (field.type === "number") {
    return base.refine?.((v: number) => typeof v === "number" && !Number.isNaN(v), { message: `${label} is required` }) ?? base
  }
  return base.min?.(1, `${label} is required`) ?? base
}

/**
 * Length / pattern / range checks (added in 2.4.0). Empty values always pass —
 * `required` (or the conditional superRefine) owns emptiness — mirroring the
 * runtime `constraintError` semantics for optional and hidden-skipped fields.
 */
function withConstraints(base: Chainable, field: Field): Chainable {
  const label = typeof field.label === "string" ? field.label : field.name
  let out = base
  const skipEmpty = (check: (v: never) => boolean, message: string) => {
    out = out.refine?.((v: never) => v === undefined || v === "" || check(v), { message }) ?? out
  }
  if (field.minLength !== undefined) {
    const n = field.minLength
    skipEmpty((v) => typeof v === "string" && (v as string).length >= n, `${label} must be at least ${n} characters`)
  }
  if (field.maxLength !== undefined) {
    const n = field.maxLength
    skipEmpty((v) => typeof v === "string" && (v as string).length <= n, `${label} must be at most ${n} characters`)
  }
  if (field.pattern !== undefined) {
    const source = field.pattern
    skipEmpty((v) => {
      if (typeof v !== "string") return false
      try {
        return new RegExp(source).test(v as string)
      } catch {
        // Invalid patterns are rejected by the schema validator; never block here.
        return true
      }
    }, `${label} format is invalid`)
  }
  if (field.min !== undefined) {
    const n = field.min
    skipEmpty((v) => typeof v === "number" && !Number.isNaN(v as number) && (v as number) >= n, `${label} must be at least ${n}`)
  }
  if (field.max !== undefined) {
    const n = field.max
    skipEmpty((v) => typeof v === "number" && !Number.isNaN(v as number) && (v as number) <= n, `${label} must be at most ${n}`)
  }
  return out
}

/** Convenience alias. */
export function toZodSchema(fields: Field[], zod: ZodLike): AnyZodSchema {
  return buildZodSchema(fields, { zod })
}
