import type { FieldComponentProps } from "../types"

export function SelectField({ field, value, onChange, error }: FieldComponentProps) {
  const options = field.options || []

  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label">{field.label}</label>
      )}

      <select
        className={`ki-select ${field.className || ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select</option>

        {options.map((opt: any, i: number) => {
          const val = typeof opt === "string" ? opt : opt.value
          const label = typeof opt === "string" ? opt : opt.label

          return (
            <option key={i} value={val}>
              {label}
            </option>
          )
        })}
      </select>

      {field.helperText && (
        <p className="ki-helper">{field.helperText}</p>
      )}

      {error && <p className="ki-error">{error}</p>}
    </div>
  )
}
