import type { FieldComponentProps } from "../types"
import { requiredProps } from "../renderer/fieldConfig"

export function CheckboxField({ field, value, onChange, error, onBlur }: FieldComponentProps) {
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
          {...requiredProps(field)}
          autoComplete={field.autoComplete === false ? "off" : field.autoComplete}
          onChange={(e) => onChange(e.target.checked)}
          onBlur={onBlur}
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
