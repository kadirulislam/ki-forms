import { useState } from "react"
import type { Field } from "../../src/types"
import { fieldSummary } from "../lib/export"

type DropPayload =
  | { kind: "palette"; fieldType: string }
  | { kind: "move"; index: number }

export type CanvasProps = {
  fields: Field[]
  selected: number | null
  onSelect: (index: number | null) => void
  onDelete: (index: number) => void
  onDuplicate: (index: number) => void
  onDrop: (payload: DropPayload, at: number) => void
}

export function Canvas({ fields, selected, onSelect, onDelete, onDuplicate, onDrop }: CanvasProps) {
  const [dragOver, setDragOver] = useState<number | null>(null)

  const payloadFromDataTransfer = (dt: DataTransfer): DropPayload | null => {
    const palette = dt.getData("application/x-ki-palette")
    if (palette) return { kind: "palette", fieldType: palette }
    const move = dt.getData("application/x-ki-move")
    if (move) return { kind: "move", index: Number(move) }
    return null
  }

  return (
    <section className="st-canvas" onClick={() => onSelect(null)}>
      <div className="st-panel-title">Canvas</div>

      {fields.length === 0 && (
        <div
          className={"st-canvas-empty" + (dragOver !== null ? " st-dragover" : "")}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(0)
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault()
            const payload = payloadFromDataTransfer(e.dataTransfer)
            setDragOver(null)
            if (payload) onDrop(payload, 0)
          }}
        >
          Drag a field here, or click one in the palette
        </div>
      )}

      {fields.map((f, i) => (
        <div key={`${f.name}-${i}`}>
          <div
            className={"st-dropline" + (dragOver === i ? " st-dropline-active" : "")}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(i)
            }}
            onDragLeave={() => setDragOver((cur) => (cur === i ? null : cur))}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const payload = payloadFromDataTransfer(e.dataTransfer)
              setDragOver(null)
              if (payload) onDrop(payload, i)
            }}
          />
          <div
            className={
              "st-fieldcard" +
              (selected === i ? " st-fieldcard-selected" : "") +
              (f.showIf ? " st-fieldcard-conditional" : "")
            }
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-ki-move", String(i))
              e.dataTransfer.effectAllowed = "move"
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(i)
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(i)
            }}
          >
            <span className="st-fieldcard-grip" title="Drag to reorder">::</span>
            <span className="st-fieldcard-name">{f.name}</span>
            <span className="st-fieldcard-type">{fieldSummary(f)}</span>
            {f.required && <span className="st-badge st-badge-req">req</span>}
            {f.showIf && <span className="st-badge st-badge-cond">showIf</span>}
            <span className="st-fieldcard-actions">
              <button
                type="button"
                title="Duplicate"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicate(i)
                }}
              >
                dup
              </button>
              <button
                type="button"
                title="Delete"
                className="st-btn-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(i)
                }}
              >
                del
              </button>
            </span>
          </div>
        </div>
      ))}

      {fields.length > 0 && (
        <div
          className={"st-dropline st-dropline-end" + (dragOver === fields.length ? " st-dropline-active" : "")}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(fields.length)
          }}
          onDragLeave={() => setDragOver((cur) => (cur === fields.length ? null : cur))}
          onDrop={(e) => {
            e.preventDefault()
            const payload = payloadFromDataTransfer(e.dataTransfer)
            setDragOver(null)
            if (payload) onDrop(payload, fields.length)
          }}
        >
          <span>drop to append</span>
        </div>
      )}
    </section>
  )
}
