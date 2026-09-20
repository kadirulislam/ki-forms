import type { ComponentType, FormEvent } from "react"

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "select"
  | "checkbox"
  | "number"
  | "textarea"

export type ShowIf = {
  /** Dependency field. Required for a single condition; omit when using all/any groups. (optional since 2.1.0 — widening, 2.0.0 schemas unchanged) */
  field?: string
  equals?: any
  notEquals?: any

  /** All of these conditions must match (added in 2.1.0). */
  all?: { field: string; equals?: any; notEquals?: any }[]
  /** At least one of these conditions must match (added in 2.1.0). */
  any?: { field: string; equals?: any; notEquals?: any }[]
}

/** Visual tokens for the built-in styles (added in 2.1.0). */
export type KiTheme = {
  accentColor?: string
  borderColor?: string
  errorColor?: string
  helperColor?: string
  radius?: string
  surfaceColor?: string
  textColor?: string
  fontFamily?: string
}

export type Field = {
  name: string
  type?: FieldType
  label?: string | false
  placeholder?: string
  options?: string[] | { label: string; value: string }[]
  defaultValue?: any

  required?: boolean
  showIf?: ShowIf

  className?: string
  helperText?: string
  onChange?: (value: any, values: Record<string, any>) => void

}

export type FieldInput = Field | string

// ---------- Public API surface (added in 2.1.0 — additive only) ----------

/** Form values as submitted / held by the form. */
export type FormValues = Record<string, any>

/**
 * Optional validation schema. Structurally compatible with any Zod schema:
 * it only requires `safeParse` when provided (2.0.0 semantics preserved).
 */
export type KiFormSchema = {
  safeParse?: (
    values: FormValues
  ) =>
    | { success: true; data?: FormValues }
    | {
        success: false
        /** zod v3 shape (`errors`) and zod v4 shape (`issues`) both accepted */
        error: {
          errors?: { path: (string | number)[]; message: string }[]
          issues?: { path: (string | number)[]; message: string }[]
        }
      }
}

/** Props passed to every field components (custom ones included). */
export type FieldComponentProps = {
  field: Field
  value: any
  error?: string
  onChange: (value: any) => void
}

/** Custom renderer map, keyed by field type. */
export type KiFormComponents = Partial<Record<FieldType, ComponentType<FieldComponentProps>>>

/**
 * The form controller returned by `useKiForm` and accepted by `<KiForm form={...} />`.
 * FROZEN SHAPE — do not remove or rename keys (compat contract with 2.0.0 users).
 */
export type FormApi = {
  fields: Field[]
  values: FormValues
  errors: Record<string, string>
  setValue: (name: string, value: any) => void
  handleSubmit: (e?: FormEvent) => void
  /** Validate a single visible field (added in 2.1.0 — additions keep the 2.0.0 keys intact) */
  validateField: (name: string) => boolean
}

export type UseKiFormOptions = {
  fields: FieldInput[]
  onSubmit?: (values: FormValues) => void
  schema?: KiFormSchema
}

export type KiFormProps = {
  fields?: FieldInput[]
  onSubmit?: (values: FormValues) => void
  schema?: KiFormSchema
  className?: string
  components?: KiFormComponents
  form?: FormApi
  /** Visual tokens mapped to --ki-* CSS variables (added in 2.1.0). */
  theme?: KiTheme
  /** "conversational" renders one field per step (added in 2.1.0). Default: "classic". */
  variant?: "classic" | "conversational"
  /** Button labels for the conversational variant (added in 2.1.0). */
  stepLabels?: { next?: string; previous?: string; submit?: string }
}
