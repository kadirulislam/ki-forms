export type FormPanelProps = {
  formTitle: string
  onTitleChange: (title: string) => void
  variant: "classic" | "conversational"
  onVariantChange: (variant: "classic" | "conversational") => void
}

export function FormPanel({ formTitle, onTitleChange, variant, onVariantChange }: FormPanelProps) {
  return (
    <div className="pb-form">
      <div className="pb-blocks-label">Form name</div>
      <input
        className="pb-form-name"
        type="text"
        value={formTitle}
        placeholder="Untitled form"
        onChange={(e) => onTitleChange(e.target.value)}
      />

      <div className="pb-blocks-label">Layout</div>
      <div className="pb-variants">
        <button
          type="button"
          className={"pb-variant" + (variant === "classic" ? " pb-variant-active" : "")}
          onClick={() => onVariantChange("classic")}
        >
          <span className="pb-variant-icon">☰</span>
          <strong>Classic</strong>
          <span className="pb-variant-desc">All fields on one page</span>
        </button>
        <button
          type="button"
          className={"pb-variant" + (variant === "conversational" ? " pb-variant-active" : "")}
          onClick={() => onVariantChange("conversational")}
        >
          <span className="pb-variant-icon">▭</span>
          <strong>Conversational</strong>
          <span className="pb-variant-desc">One question per step</span>
        </button>
      </div>
      <p className="pb-style-hint">
        {variant === "conversational"
          ? "Exports with variant=\"conversational\" — stepper UI, Enter-to-advance, conditional fields skipped automatically."
          : "Exports as a single-page form — the classic ki-forms layout."}
      </p>
    </div>
  )
}
