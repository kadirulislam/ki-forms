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

  function validate() {
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
        for (const err of result.error.errors) {
          const key = err.path[0]
          if (key) newErrors[key] = err.message
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()

    const isValid = validate()
    if (!isValid) return

    onSubmit?.(values)
  }

  return {
    fields: normalizedFields,
    values,
    errors,
    setValue,
    handleSubmit
  }
}
