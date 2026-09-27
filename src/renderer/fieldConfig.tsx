import { createContext, useContext } from "react"

/**
 * Form-level render config for field components (2.5.0).
 *
 * `requiredMarker` is a `<KiForm>` prop but fields render one at a time through
 * `FieldRenderer`, which only receives `field` / `form` / `components`. Context
 * threads it down without adding a key to the frozen `FormApi` surface or to
 * `FieldComponentProps` (which is a public contract for custom components).
 */
export type FieldRenderConfig = {
  requiredMarker: "none" | "asterisk" | "legend"
}

const defaultConfig: FieldRenderConfig = { requiredMarker: "none" }

export const FieldConfigContext = createContext<FieldRenderConfig>(defaultConfig)

export function useFieldConfig(): FieldRenderConfig {
  return useContext(FieldConfigContext)
}

/**
 * The visible required marker. Decorative: `aria-required` on the control is
 * what actually communicates the requirement, so this is hidden from assistive
 * tech to avoid "required required" announcements.
 */
export function RequiredMarker() {
  return (
    <span aria-hidden="true" className="ki-required-marker">
      *
    </span>
  )
}

/** Shared a11y wiring so every built-in field reports required state the same way. */
export function requiredProps(field: { required?: boolean }): {
  "aria-required": true | undefined
} {
  return { "aria-required": field.required ? true : undefined }
}
