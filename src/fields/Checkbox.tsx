import type { FieldComponentProps } from "../types"

export function CheckboxField({ field, value, onChange, error }: FieldComponentProps) {
  return (
    <div className="ki-form-item">
      <label className="ki-label ki-checkbox">
        <input
          type="checkbox"
          className={`ki-checkbox-input ${field.className || ""}`}
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{field.label !== false ? field.label : field.name}</span>
      </label>

      {field.helperText && (
        <p className="ki-helper">{field.helperText}</p>
      )}

      {error && <p className="ki-error">{error}</p>}
    </div>
  )
}
