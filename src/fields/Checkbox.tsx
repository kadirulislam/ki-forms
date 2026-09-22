import type { FieldComponentProps } from "../types"

export function CheckboxField({ field, value, onChange, error }: FieldComponentProps) {
  const id = `ki-${field.name}`
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  return (
    <div className="ki-form-item">
      <label className="ki-label ki-checkbox" htmlFor={id}>
        <input
          type="checkbox"
          id={id}
          className={`ki-checkbox-input ${field.className || ""}`}
          checked={!!value}
          aria-invalid={error ? true : undefined}
          aria-describedby={[field.helperText ? helperId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label !== false ? field.label : field.name}</span>
      </label>

      {field.helperText && (
        <p id={helperId} className="ki-helper">{field.helperText}</p>
      )}

      {error && <p id={errorId} className="ki-error">{error}</p>}
    </div>
  )
}
