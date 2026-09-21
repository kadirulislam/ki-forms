import { useState } from "react"
import { applyDefaults } from "../utils/defaults"
import { shouldShow } from "../utils/conditions"
import { Field, FieldInput, FormApi, FormValues, UseKiFormOptions } from "../types"

export function useKiForm(options: UseKiFormOptions): FormApi {
  const { fields, onSubmit, schema } = options

  const normalizedFields: Field[] = fields
    .map((f: FieldInput) =>
      typeof f === "string" ? { name: f } : f
    )
    .map(applyDefaults)

  const initialValues = normalizedFields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue ?? ""
    return acc
  }, {} as FormValues)

  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function setValue(name: string, value: any) {
    setValues((prev) => {
      const updated = { ...prev, [name]: value }

      const field = normalizedFields.find(f => f.name === name)
      field?.onChange?.(value, updated)

      return updated
    })
  }

  /** Validate all visible fields, update the error map, return pass/fail (2.2.0). */
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    for (const field of normalizedFields) {
      if (!shouldShow(field, values)) continue

      if (field.required && !values[field.name]) {
        newErrors[field.name] = `${field.label} is required`
      }
    }

    if (schema?.safeParse) {
      const result = schema.safeParse(values)
      if (!result.success) {
        // zod v3 exposes error.errors; zod v4 renamed it to error.issues.
        const issues = result.error.errors ?? result.error.issues ?? []
        for (const err of issues) {
          const key = err.path?.[0]
          if (key) newErrors[key] = err.message
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
    if (field.required && !values[field.name]) {
      error = `${field.label} is required`
    } else if (schema?.safeParse) {
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

    onSubmit?.(values)
  }

  function handleSubmitChecked(e?: React.FormEvent): boolean {
    if (e) e.preventDefault()
    const isValid = validate()
    if (!isValid) return false
    onSubmit?.(values)
    return true
  }

  return {
    fields: normalizedFields,
    values,
    errors,
    setValue,
    handleSubmit,
    validateField,
    validate,
    handleSubmitChecked
  }
}
