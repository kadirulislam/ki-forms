import { Field } from "../types"

function formatLabel(name: string) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
}

export function applyDefaults(field: Field): Field {
  const name = field.name.toLowerCase()

  let inferredType = field.type

  if (!inferredType) {
    if (name.includes("email")) inferredType = "email"
    else if (name.includes("password")) inferredType = "password"
    else if (field.options) inferredType = "select"
    else inferredType = "text"
  }

  const label =
    field.label === false
      ? false
      : field.label || formatLabel(field.name)

  const placeholder =
    field.placeholder ||
    (label ? `Enter your ${label.toLowerCase()}` : "")

  return {
    ...field,
    type: inferredType,
    label,
    placeholder
  }
}