export function TextareaField({ field, value, onChange, error }: any) {
  return (
    <div className="ki-form-item">
      {field.label !== false && (
        <label className="ki-label">{field.label}</label>
      )}

      <textarea
        className={`ki-input ${field.className || ""}`}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />

      {error && <p className="ki-error">{error}</p>}
    </div>
  )
}