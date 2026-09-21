import type { ShowIf } from "../types"

export type Condition = { field: string; equals?: unknown; notEquals?: unknown }

function matches(condition: Condition, values: Record<string, unknown>): boolean {
  const value = values[condition.field]
  if (condition.equals !== undefined) return value === condition.equals
  if (condition.notEquals !== undefined) return value !== condition.notEquals
  return false
}

export function evaluateCondition(showIf: ShowIf | undefined, values: Record<string, unknown>): boolean {
  if (!showIf) return true

  const single = showIf.field ? matches({ field: showIf.field, equals: showIf.equals, notEquals: showIf.notEquals }, values) : true
  const all = showIf.all ? showIf.all.every((condition) => matches(condition, values)) : true
  const any = showIf.any ? showIf.any.some((condition) => matches(condition, values)) : true

  return single && all && any
}
