import type { FieldComponentProps } from "../types"

export function InputField({ field, value, onChange, error }: FieldComponentProps) {
  const id = `ki-${field.name}`
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label" htmlFor={id}>{field.label}</label>
      )}

      <input
        className={`ki-input ${field.className || ""}`}
        id={id}
        type={field.type}
        value={typeof value === "boolean" ? "" : (value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={[field.helperText ? helperId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        placeholder={field.placeholder}
        onChange={(e) => {
          const val =
            field.type === "number"
              ? e.target.value === "" ? "" : Number(e.target.value)
              : e.target.value

          onChange(val)
        }}
      />

      {field.helperText && (
        <p id={helperId} className="ki-helper">{field.helperText}</p>
      )}

      {error && <p id={errorId} className="ki-error">{error}</p>}
    </div>
  )
}
