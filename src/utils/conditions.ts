import { Field, ShowIf } from "../types"

type Condition = { field?: string; equals?: any; notEquals?: any }

function matches(cond: Condition, values: Record<string, any>): boolean {
  const val = cond.field !== undefined ? values[cond.field] : undefined

  if (cond.equals !== undefined) return val === cond.equals
  if (cond.notEquals !== undefined) return val !== cond.notEquals

  return true
}

export function shouldShow(field: Field, values: Record<string, any>) {
  const showIf: ShowIf | undefined = field.showIf
  if (!showIf) return true

  // Legacy single condition — 2.0.0 semantics, untouched
  if (showIf.all === undefined && showIf.any === undefined) {
    return matches(showIf, values)
  }

  // Groups — added in 2.1.0 (combine with a top-level condition via AND)
  if (showIf.all && !showIf.all.every((c) => matches(c, values))) return false
  if (showIf.any && !showIf.any.some((c) => matches(c, values))) return false

  return true
}
