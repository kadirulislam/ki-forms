import { Field } from "../types"
import { evaluateCondition } from "../schema/conditions"

export function shouldShow(field: Field, values: Record<string, any>) {
  return evaluateCondition(field.showIf, values)
}
