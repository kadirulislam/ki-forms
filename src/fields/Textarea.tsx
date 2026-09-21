import type { FieldComponentProps } from "../types"

export function TextareaField({ field, value, onChange, error }: FieldComponentProps) {
  const id = `ki-${field.name}`
  const errorId = `${id}-error`
  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label" htmlFor={id}>{field.label}</label>
      )}

      <textarea
        className={`ki-input ${field.className || ""}`}
        id={id}
        value={typeof value === "boolean" ? "" : (value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      {field.helperText && <p className="ki-helper">{field.helperText}</p>}
      {error && <p id={errorId} className="ki-error">{error}</p>}
    </div>
  )
}
