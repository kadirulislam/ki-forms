export function InputField({ field, value, onChange, error }: any) {
  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label">{field.label}</label>
      )}

      <input
        className={`ki-input ${field.className || ""}`}
        type={field.type}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => {
          const val =
            field.type === "number"
              ? Number(e.target.value)
              : e.target.value

          onChange(val)
        }}
      />

      {field.helperText && (
        <p className="ki-helper">{field.helperText}</p>
      )}

      {error && <p className="ki-error">{error}</p>}
    </div>
  )
}