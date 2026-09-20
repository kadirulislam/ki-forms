import { useState } from "react"
import type { Field } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import type { KiTheme } from "../../src/types"

type DropPayload =
  | { kind: "palette"; fieldType: string }
  | { kind: "move"; index: number }

export type PaperFormProps = {
  fields: Field[]
  theme?: KiTheme
  variant?: "classic" | "conversational"
  selected: number | null
  onSelect: (index: number) => void
  onDelete: (index: number) => void
  onDuplicate: (index: number) => void
  onDrop: (payload: DropPayload, at: number) => void
}

/**
 * The live form "paper": the real KiForm rendering on a white sheet, wrapped
 * with selection outlines, hover actions, drag-reorder and drop gaps.
 */
export function PaperForm({ fields, theme, variant = "classic", selected, onSelect, onDelete, onDuplicate, onDrop }: PaperFormProps) {
  const [dropAt, setDropAt] = useState<number | null>(null)

  const payloadFromDataTransfer = (dt: DataTransfer): DropPayload | null => {
    const palette = dt.getData("application/x-ki-palette")
    if (palette) return { kind: "palette", fieldType: palette }
    const move = dt.getData("application/x-ki-move")
    if (move) return { kind: "move", index: Number(move) }
    return null
  }

  const acceptDrop = (at: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const payload = payloadFromDataTransfer(e.dataTransfer)
    setDropAt(null)
    if (payload) onDrop(payload, at)
  }

  const dropline = (at: number) => (
    <div
      className={"pf-dropline" + (dropAt === at ? " pf-dropline-active" : "")}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDropAt(at)
      }}
      onDrop={acceptDrop(at)}
    />
  )

  return (
    <div className="pf-paper" onDragLeave={() => setDropAt(null)}>
      {fields.length === 0 ? (
        <div
          className={"pf-empty" + (dropAt === 0 ? " pf-empty-active" : "")}
          onDragOver={(e) => {
            e.preventDefault()
            setDropAt(0)
          }}
          onDrop={acceptDrop(0)}
        >
          <strong>Drop your first field here</strong>
          <span>or click a block on the left to append it</span>
        </div>
      ) : (
        <>
          {dropline(0)}
          {fields.map((f, i) => (
            <div key={`${f.name}-${i}`} className="pf-slot">
              <div
                className={
                  "pf-fieldwrap" +
                  (selected === i ? " pf-fieldwrap-selected" : "") +
                  (f.showIf ? " pf-fieldwrap-conditional" : "")
                }
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-ki-move", String(i))
                  e.dataTransfer.effectAllowed = "move"
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDropAt(i)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(i)
                }}
              >
                <div className="pf-field-render">
                  <KiForm key={fields.map((x) => x.name).join("|")} fields={[f]} theme={theme} variant={variant} />
                </div>
                <div className="pf-field-actions">
                  <button
                    type="button"
                    title="Duplicate"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(i)
                    }}
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="pf-danger"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(i)
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {dropline(i + 1)}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
