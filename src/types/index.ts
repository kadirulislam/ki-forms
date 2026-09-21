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
  /** Validate all visible fields without submitting (added in 2.2.0 — additive) */
  validate: () => boolean
  /** Internal: validate + fire onSubmit, returning whether it passed (2.2.0). */
  handleSubmitChecked: (e?: FormEvent) => boolean
}

export type UseKiFormOptions = {
  fields: FieldInput[]
  onSubmit?: (values: FormValues) => void
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

export type KiFormProps = {
  fields?: FieldInput[]
  /** Widened in 2.2.0: async handlers are allowed. Called on every valid submit. */
  onSubmit?: (values: FormValues) => void | Promise<unknown>
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
