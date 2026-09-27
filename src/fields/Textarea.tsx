import type { FieldComponentProps } from "../types"
import { RequiredMarker, requiredProps, useFieldConfig } from "../renderer/fieldConfig"

export function TextareaField({ field, value, onChange, error, onBlur }: FieldComponentProps) {
  const id = `ki-${field.name}`
  const errorId = `${id}-error`
  const { requiredMarker } = useFieldConfig()
  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label" htmlFor={id}>
          {field.label}
          {field.required && requiredMarker === "asterisk" ? <RequiredMarker /> : null}
        </label>
      )}

      <textarea
        className={`ki-input ${field.className || ""}`}
        id={id}
        value={typeof value === "boolean" ? "" : (value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...requiredProps(field)}
        autoComplete={field.autoComplete === false ? "off" : field.autoComplete}
        inputMode={field.inputMode}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />

      {field.helperText && <p className="ki-helper">{field.helperText}</p>}
      {error && <p id={errorId} className="ki-error">{error}</p>}
    </div>
  )
}
