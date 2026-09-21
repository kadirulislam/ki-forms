import type { ComponentType, FormEvent } from "react"

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "select"
  | "checkbox"
  | "number"
  | "textarea"
  | "tel"
  | "url"
  | "date"

export type Condition = { field: string; equals?: unknown; notEquals?: unknown }

export type ShowIf = {
  /** Dependency field. Combined with all/any groups via AND when both are present. */
  field?: string
  equals?: unknown
  notEquals?: unknown

  /** All of these conditions must match (added in 2.1.0). */
  all?: Condition[]
  /** At least one of these conditions must match (added in 2.1.0). */
  any?: Condition[]
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
  defaultValue?: string | number | boolean

  required?: boolean
  showIf?: ShowIf

  className?: string
  helperText?: string
  onChange?: (value: unknown, values: Record<string, unknown>) => void

}

export type FieldValue<T extends Field> =
  T["type"] extends "number" ? number :
  T["type"] extends "checkbox" ? boolean : string

export type InferFormValues<T extends readonly FieldInput[]> = {
  -readonly [K in T[number] extends infer F
    ? F extends { name: infer N extends string } ? N : never
    : never]: Extract<T[number], { name: K }> extends infer F
      ? F extends Field
        ? F["required"] extends true ? FieldValue<F> : FieldValue<F> | undefined
        : string | undefined
      : never
}

/** Canonical portable form document shared by runtime, Studio, export, and docs. */
export type KiFormDocument = {
  version: 1
  fields: FieldInput[]
  name?: string
  theme?: KiTheme
  variant?: "classic" | "conversational"
  endpoint?: string
}

export type FieldInput = Field | string

export function defineFields<const T extends readonly FieldInput[]>(fields: T): T {
  return fields
}

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
export type FieldComponentProps<TValue = string | number | boolean> = {
  field: Field
  value: TValue
  error?: string
  onChange: (value: TValue) => void
}

/** Custom renderer map, keyed by field type. */
export type KiFormComponents = Partial<Record<FieldType, ComponentType<FieldComponentProps>>>

/**
 * The form controller returned by `useKiForm` and accepted by `<KiForm form={...} />`.
 * FROZEN SHAPE — do not remove or rename keys (compat contract with 2.0.0 users).
 */
export type FormApi<TValues extends FormValues = FormValues> = {
  fields: Field[]
  values: TValues
  errors: Record<string, string>
  setValue: (name: string, value: unknown) => void
  handleSubmit: (e?: FormEvent) => void
  /** Validate a single visible field (added in 2.1.0 — additions keep the 2.0.0 keys intact) */
  validateField: (name: string) => boolean
  /** Validate all visible fields without submitting (added in 2.2.0 — additive) */
  validate: () => boolean
  /** Internal: validate + fire onSubmit, returning whether it passed (2.2.0). */
  handleSubmitChecked: (e?: FormEvent) => boolean
}

export type UseKiFormOptions<TValues extends FormValues = FormValues> = {
  fields?: FieldInput[]
  onSubmit?: (values: TValues) => void | Promise<unknown>
  schema?: KiFormSchema
}

/**
 * Lifecycle of a submission sent to `endpoint` (added in 2.2.0).
 * Forms without `endpoint` stay idle forever (2.0.0 behavior unchanged).
 */
export type SubmissionState = "idle" | "submitting" | "success" | "error"

/** Envelope metadata sent alongside values when `endpoint` is set (added in 2.2.0). */
export type SubmissionMeta = {
  submittedAt: string
  pageUrl?: string
  referrer?: string
  userAgent?: string
}

/** Result of an endpoint submission, passed to `onSubmitted` (added in 2.2.0). */
export type SubmitEndpointResult = {
  ok: boolean
  /** Parsed JSON response body when the endpoint replies with JSON. */
  response?: unknown
  /** Human-readable error when `ok` is false. */
  error?: string
}

export type KiFormProps<TValues extends FormValues = FormValues, TFields extends readonly FieldInput[] = FieldInput[]> = {
  fields?: TFields
  /** Widened in 2.2.0: async handlers are allowed. Called on every valid submit. */
  onSubmit?: (values: TValues) => void | Promise<unknown>
  schema?: KiFormSchema
  className?: string
  components?: KiFormComponents
  form?: FormApi<TValues>
  /** Visual tokens mapped to --ki-* CSS variables (added in 2.1.0). */
  theme?: KiTheme
  /** "conversational" renders one field per step (added in 2.1.0). Default: "classic". */
  variant?: "classic" | "conversational"
  /** Button labels for the conversational variant (added in 2.1.0). */
  stepLabels?: { next?: string; previous?: string; submit?: string }

  // ---------- Collect responses (added in 2.2.0 — all optional) ----------
  /**
   * POST target for submissions: every valid submit sends
   * `{ values, meta }` as JSON. Works with Formspree, Web3Forms, Basin,
   * Discord/automation webhooks, or a Google Apps Script Web App.
   */
  endpoint?: string
  /** HTTP method for `endpoint`. Default: "POST". */
  method?: "POST" | "PUT"
  /** Extra request headers for `endpoint` calls. */
  headers?: Record<string, string>
  /** Submit button label. Default: "Submit". */
  submitLabel?: string
  /** Status line label while the request is in flight. Default: "Submitting…". */
  submittingLabel?: string
  /** Status line label after a successful POST. */
  successLabel?: string
  /** Status line label prefix when the POST fails. */
  errorLabel?: string
  /** Hide the built-in status line (you render your own from `onSubmitted`). */
  hideSubmitStatus?: boolean
  /** Called after the endpoint request settles (success or failure). */
  onSubmitted?: (result: SubmitEndpointResult) => void
}
