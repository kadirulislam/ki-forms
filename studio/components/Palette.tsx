import type { FieldType } from "../../src/types"

const PALETTE: { type: FieldType; label: string; icon: string; hint: string }[] = [
  { type: "text", label: "Text", icon: "Aa", hint: "Short single-line input" },
  { type: "email", label: "Email", icon: "@", hint: "Email input" },
  { type: "password", label: "Password", icon: "***", hint: "Masked input" },
  { type: "number", label: "Number", icon: "#", hint: "Numeric input" },
  { type: "textarea", label: "Textarea", icon: "=?", hint: "Multi-line text" },
  { type: "select", label: "Select", icon: "v", hint: "Dropdown with options" },
  { type: "checkbox", label: "Checkbox", icon: "[x]", hint: "Boolean toggle" },
]

export function Palette() {
  return (
    <aside className="st-panel st-palette">
      <div className="st-panel-title">Fields</div>
      <div className="st-palette-grid">
        {PALETTE.map((p) => (
          <button
            key={p.type}
            type="button"
            className="st-palette-item"
            title={p.hint}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-ki-palette", p.type)
              e.dataTransfer.effectAllowed = "copy"
            }}
          >
            <span className="st-palette-icon">{p.icon}</span>
            <span className="st-palette-label">{p.label}</span>
          </button>
        ))}
      </div>
      <p className="st-palette-hint">Drag onto the canvas, or click to append.</p>
    </aside>
  )
}
