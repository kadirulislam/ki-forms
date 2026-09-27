import { useEffect, useRef, useState } from "react"
import { applyDefaults } from "../utils/defaults"
import { shouldShow } from "../utils/conditions"
import { constraintMessage, requiredMessage } from "../utils/messages"
import { Field, FieldInput, FormApi, FormValues, KiFormSchema, UseKiFormOptions } from "../types"

export function useKiForm<TValues extends FormValues = FormValues>(options: UseKiFormOptions<TValues>): FormApi<TValues> {
  const { fields = [], onSubmit, schema, validateOn = "submit" } = options

  const normalizedFields: Field[] = fields
    .map((f: FieldInput) =>
      typeof f === "string" ? { name: f } : f
    )
    .map(applyDefaults)

  const initialValues = normalizedFields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? (field.type === "checkbox" ? false : "")
    return acc
  }, {} as FormValues)

  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  /**
   * Fields the user has left at least once. `validateOn: "blur"` shows an error
   * on first blur ("punish late") and then revalidates on every keystroke while
   * the field is in error ("reward early"), which is the pattern usability
   * research converges on. Validating on every keystroke from the start is a
   * documented anti-pattern: it flags a half-typed email as invalid.
   */
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const valuesRef = useRef<FormValues>(values)
  valuesRef.current = values

  useEffect(() => {
    const names = new Set(normalizedFields.map((field) => field.name))
    setValues((previous) => {
      const next: FormValues = {}
      for (const field of normalizedFields) {
        next[field.name] = field.name in previous
          ? previous[field.name]
          : field.defaultValue ?? (field.type === "checkbox" ? false : "")
      }
      return Object.keys(next).length === Object.keys(previous).length &&
        Object.keys(next).every((name) => next[name] === previous[name]) ? previous : next
    })
    setErrors((previous) => {
      const next = Object.fromEntries(Object.entries(previous).filter(([name]) => names.has(name)))
      return Object.keys(next).length === Object.keys(previous).length ? previous : next
    })
  }, [normalizedFields])

  /**
   * The single source of error text for one field against one set of values.
   * `validate`, `validateField` and the live blur path all funnel through here —
   * they previously each reimplemented the required/constraint branching.
   */
  function errorForField(field: Field, current: FormValues, external?: KiFormSchema): string | undefined {
    if (!shouldShow(field, current)) return undefined

    if (field.required && isEmptyValue(field, current[field.name])) {
      return requiredMessage(field)
    }
    const constraint = constraintMessage(field, current[field.name])
    if (constraint) return constraint

    if (external?.safeParse) {
      const result = external.safeParse(current)
      if (!result.success) {
        // zod v3 exposes error.errors; zod v4 renamed it to error.issues.
        const issues = result.error.errors ?? result.error.issues ?? []
        const mine = issues.find((issue: { path?: (string | number)[] }) => issue.path?.[0] === field.name)
        if (mine) return mine.message
      }
    }
    return undefined
  }

  function setValue(name: string, value: unknown) {
    const field = normalizedFields.find(f => f.name === name)
    const updated = { ...valuesRef.current, [name]: value }
    setValues((prev) => {
      return { ...prev, [name]: value }
    })
    field?.onChange?.(value, updated)

    // Reward early: once a field has been shown an error, clear it the moment
    // the value becomes valid rather than waiting for another blur.
    if (validateOn === "blur" && touched[name]) {
      const error = field ? errorForField(field, updated, schema) : undefined
      setErrors((prev) => {
        if (error) return prev[name] === error ? prev : { ...prev, [name]: error }
        if (!(name in prev)) return prev
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  /** Mark a field visited and show its error if it has one (2.5.0). */
  function handleBlur(name: string) {
    if (validateOn !== "blur") return
    setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }))
    const field = normalizedFields.find((f) => f.name === name)
    if (!field) return
    const error = errorForField(field, valuesRef.current, schema)
    setErrors((prev) => {
      if (error) return prev[name] === error ? prev : { ...prev, [name]: error }
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  /** Validate all visible fields, update the error map, return pass/fail (2.2.0). */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    for (const field of normalizedFields) {
      if (!shouldShow(field, values)) continue
      const error = errorForField(field, values, schema)
      if (error) newErrors[field.name] = error
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /** Validate one visible field in isolation (added in 2.1.0 for per-step UIs).
   *  Merges the result into the error map without clearing other fields' errors. */
  function validateField(name: string): boolean {
    const field = normalizedFields.find((f) => f.name === name)
    if (!field || !shouldShow(field, values)) return true

    const error = errorForField(field, values, schema)

    setErrors((prev) => {
      if (!error) {
        if (!(name in prev)) return prev
        const next = { ...prev }
        delete next[name]
        return next
      }
      return { ...prev, [name]: error }
      })
    return !error
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()

    const isValid = validate()
    if (!isValid) return

    onSubmit?.(values as TValues)
  }

  function handleSubmitChecked(e?: React.FormEvent): boolean {
    if (e) e.preventDefault()
    const isValid = validate()
    if (!isValid) return false
    onSubmit?.(values as TValues)
    return true
  }

  return {
    fields: normalizedFields,
    values: values as TValues,
    errors,
    setValue,
    handleSubmit,
    validateField,
    validate,
    handleSubmitChecked,
    touched,
    handleBlur
  }
}

function isEmptyValue(field: Field, value: unknown): boolean {
  if (field.type === "checkbox") return value !== true
  if (field.type === "number") return value === "" || value === undefined || value === null || Number.isNaN(value)
  return value === "" || value === undefined || value === null || (typeof value === "string" && value.trim() === "")
}

/**
 * Field-constraint check (added in 2.4.0): length / pattern for text-like
 * values, range for numbers. Empty values are skipped — `required` owns
 * emptiness — and hidden fields never reach this helper.
 *
 * Delegates to `constraintMessage` so per-field `messages` overrides apply here
 * too. Kept exported for 2.4.0 compatibility.
 */
export function constraintError(field: Field, value: unknown): string | undefined {
  return constraintMessage(field, value)
}
