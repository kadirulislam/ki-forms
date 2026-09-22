import { useEffect, useState } from "react"
import { applyDefaults } from "../utils/defaults"
import { shouldShow } from "../utils/conditions"
import { Field, FieldInput, FormApi, FormValues, UseKiFormOptions } from "../types"

export function useKiForm<TValues extends FormValues = FormValues>(options: UseKiFormOptions<TValues>): FormApi<TValues> {
  const { fields = [], onSubmit, schema } = options

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

  function setValue(name: string, value: unknown) {
    const field = normalizedFields.find(f => f.name === name)
    const updated = { ...values, [name]: value }
    setValues((prev) => {
      return { ...prev, [name]: value }
    })
    field?.onChange?.(value, updated)
  }

  /** Validate all visible fields, update the error map, return pass/fail (2.2.0). */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    for (const field of normalizedFields) {
      if (!shouldShow(field, values)) continue

      if (field.required && isEmptyValue(field, values[field.name])) {
        newErrors[field.name] = `${field.label} is required`
      } else {
        const constraint = constraintError(field, values[field.name])
        if (constraint) newErrors[field.name] = constraint
      }
    }

    if (schema?.safeParse) {
      const result = schema.safeParse(values)
      if (!result.success) {
        // zod v3 exposes error.errors; zod v4 renamed it to error.issues.
        const issues = result.error.errors ?? result.error.issues ?? []
        for (const err of issues) {
          const key = err.path?.[0]
          const dependent = normalizedFields.find((field) => field.name === key)
          if (key && dependent && shouldShow(dependent, values)) newErrors[key] = err.message
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /** Validate one visible field in isolation (added in 2.1.0 for per-step UIs).
   *  Merges the result into the error map without clearing other fields' errors. */
  function validateField(name: string): boolean {
    const field = normalizedFields.find((f) => f.name === name)
    if (!field || !shouldShow(field, values)) return true

    let error: string | undefined
    if (field.required && isEmptyValue(field, values[field.name])) {
      error = `${field.label} is required`
    } else {
      error = constraintError(field, values[field.name]) ?? undefined
    }
    if (!error && schema?.safeParse) {
      const result = schema.safeParse(values)
      if (!result.success) {
        const issues = result.error.errors ?? result.error.issues ?? []
        const mine = issues.find((issue: any) => issue.path?.[0] === name)
        if (mine) error = mine.message
      }
    }

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
    handleSubmitChecked
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
 */
export function constraintError(field: Field, value: unknown): string | undefined {
  const label = typeof field.label === "string" ? field.label : field.name
  if (typeof value === "string" && value !== "") {
    if (field.minLength !== undefined && value.length < field.minLength) {
      return `${label} must be at least ${field.minLength} characters`
    }
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return `${label} must be at most ${field.maxLength} characters`
    }
    if (field.pattern !== undefined) {
      try {
        if (!new RegExp(field.pattern).test(value)) return `${label} format is invalid`
      } catch {
        // Invalid patterns are rejected by the schema validator; never crash here.
      }
    }
    return undefined
  }
  if (typeof value === "number" && !Number.isNaN(value)) {
    if (field.min !== undefined && value < field.min) return `${label} must be at least ${field.min}`
    if (field.max !== undefined && value > field.max) return `${label} must be at most ${field.max}`
    return undefined
  }
  return undefined
}
