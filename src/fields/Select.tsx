import type { FieldComponentProps } from "../types"

export function SelectField({ field, value, onChange, error }: FieldComponentProps) {
  const options = field.options || []
  const id = `ki-${field.name}`
  const errorId = `${id}-error`

  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label" htmlFor={id}>{field.label}</label>
      )}

      <select
        className={`ki-select ${field.className || ""}`}
        id={id}
        value={typeof value === "boolean" ? "" : (value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
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

      {error && <p id={errorId} className="ki-error">{error}</p>}
    </div>
  )
}
