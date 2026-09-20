import type { Field } from "./types"
import { shouldShow } from "./utils/conditions"

type AnyZodSchema = { safeParse: (values: any) => any }

export type ZodLike = {
  string: () => any
  number: () => any
  boolean: () => any
  object: (shape: Record<string, any>) => any
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
export function buildZodSchema(
  fields: Field[],
  options: { zod: ZodLike; requiredWhen?: Record<string, Field["showIf"]> }
): AnyZodSchema {
  const { zod, requiredWhen = {} } = options
  const shape: Record<string, any> = {}

  for (const field of fields) {
    let base: any

    switch (field.type) {
      case "number":
        base = zod.number()
        break
      case "checkbox":
        base = zod.boolean()
        break
      default:
        base = zod.string()
        if (field.type === "email" && typeof base.email === "function") {
          base = base.email("Enter a valid email")
        }
    }

    if (field.required) {
      shape[field.name] = withRequired(base, field)
    } else if (requiredWhen[field.name]) {
      // conditional requirements are enforced at object level below
      shape[field.name] = base.optional()
    } else {
      shape[field.name] = base.optional()
    }
  }

  let objectSchema = zod.object(shape)

  const conditionalFields = Object.keys(requiredWhen)
  if (conditionalFields.length > 0) {
    objectSchema = objectSchema.superRefine((values: any, ctx: any) => {
      for (const name of conditionalFields) {
        const field = fields.find((f) => f.name === name)
        if (!field) continue

        const cond = requiredWhen[name]
        const shown = shouldShow({ ...field, showIf: cond }, values)

        const value = values[name]
        const empty =
          field.type === "checkbox" ? value !== true : value === "" || value === undefined || value === null

        if (shown && empty) {
          ctx.addIssue({
            code: "custom",
            message: `${field.label ?? field.name} is required`,
            path: [name],
          })
        }
      }
    })
  }

  return objectSchema
}

function withRequired(base: any, field: Field) {
  const label = field.label ?? field.name

  if (field.type === "checkbox") {
    return base.refine((v: boolean) => v === true, { message: `${label} must be checked` })
  }
  if (field.type === "number") {
    return base.refine((v: number) => !Number.isNaN(v), { message: `${label} is required` })
  }
  return base.min(1, `${label} is required`)
}

/** Convenience alias. */
export function toZodSchema(fields: Field[], zod: ZodLike): AnyZodSchema {
  return buildZodSchema(fields, { zod })
}
