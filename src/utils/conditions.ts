import { Field } from "../types"

export function shouldShow(field: Field, values: Record<string, any>) {
  if (!field.showIf) return true

  const { field: dep, equals, notEquals } = field.showIf
  const val = values[dep]

  if (equals !== undefined) return val === equals
  if (notEquals !== undefined) return val !== notEquals

  return true
}