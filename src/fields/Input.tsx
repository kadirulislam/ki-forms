import type { FieldComponentProps } from "../types"
import { RequiredMarker, requiredProps, useFieldConfig } from "../renderer/fieldConfig"

export function InputField({ field, value, onChange, error, onBlur }: FieldComponentProps) {
  const id = `ki-${field.name}`
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  const { requiredMarker } = useFieldConfig()
  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label" htmlFor={id}>
          {field.label}
          {field.required && requiredMarker === "asterisk" ? <RequiredMarker /> : null}
        </label>
      )}

      <input
        className={`ki-input ${field.className || ""}`}
        id={id}
        type={field.type}
        value={typeof value === "boolean" ? "" : (value ?? "")}
        aria-invalid={error ? true : undefined}
        aria-describedby={[field.helperText ? helperId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        {...requiredProps(field)}
        // Inferred in applyDefaults; see utils/autocomplete for why guessing is worse than none.
        autoComplete={field.autoComplete === false ? "off" : field.autoComplete}
        inputMode={field.inputMode}
        placeholder={field.placeholder}
        onChange={(e) => {
          const val =
            field.type === "number"
              ? e.target.value === "" ? "" : Number(e.target.value)
              : e.target.value

          onChange(val)
        }}
        onBlur={onBlur}
      />

      {field.helperText && (
        <p id={helperId} className="ki-helper">{field.helperText}</p>
      )}

      {error && <p id={errorId} className="ki-error">{error}</p>}
    </div>
  )
}
