import type { FieldType } from "../../src/types"

const BLOCKS: { type: FieldType; label: string; icon: string }[] = [
  { type: "text", label: "Text", icon: "T" },
  { type: "email", label: "Email", icon: "@" },
  { type: "password", label: "Password", icon: "***" },
  { type: "number", label: "Number", icon: "#" },
  { type: "textarea", label: "Textarea", icon: "¶" },
  { type: "select", label: "Select", icon: "▾" },
  { type: "checkbox", label: "Checkbox", icon: "☑" },
]

export type BlocksPanelProps = {
  onAdd: (fieldType: string) => void
}

export function BlocksPanel({ onAdd }: BlocksPanelProps) {
  return (
    <div className="pb-blocks">
      <div className="pb-blocks-label">Drag &amp; drop elements</div>
      <div className="pb-blocks-grid">
        {BLOCKS.map((b) => (
          <button
            key={b.type}
            type="button"
            className="pb-block"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-ki-palette", b.type)
              e.dataTransfer.effectAllowed = "copy"
            }}
            onClick={() => onAdd(b.type)}
          >
            <span className="pb-block-grip" aria-hidden>
              ⋯
            </span>
            <span className="pb-block-icon" aria-hidden>
              {b.icon}
            </span>
            <span className="pb-block-label">{b.label}</span>
          </button>
        ))}
      </div>
      <div className="pb-tip">
        <span className="pb-tip-icon">ⓘ</span>
        <span>
          <strong>Tip:</strong> Drag blocks directly to any position on the canvas or click to append.
        </span>
      </div>
    </div>
  )
}
