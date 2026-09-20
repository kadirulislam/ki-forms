import { useState } from "react"
import type { Field } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import type { KiTheme } from "../../src/types"
import { cn } from "../lib/utils"
import { Copy, Trash2 } from "lucide-react"

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
      className={cn("relative h-0", dropAt === at && "z-10")}
      onDragOver={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDropAt(at)
      }}
      onDrop={acceptDrop(at)}
    >
      {dropAt === at && (
        <div className="pointer-events-none absolute inset-x-0 -top-2 h-4">
          <div className="h-0.5 w-full rounded-full bg-[--studio-accent]" />
          <div className="absolute -top-[3px] left-0 size-2 rounded-full bg-[--studio-accent]" />
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6" onDragLeave={() => setDropAt(null)}>
      {fields.length === 0 ? (
        <div
          className={cn(
            "flex min-h-56 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            dropAt === 0 ? "border-[--studio-accent] bg-[--studio-accent]/5" : "border-border",
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setDropAt(0)
          }}
          onDrop={acceptDrop(0)}
        >
          <strong className="text-sm font-medium">Drop your first field here</strong>
          <span className="text-xs text-muted-foreground">or click a block on the left to append it</span>
        </div>
      ) : (
        <>
          {dropline(0)}
          {fields.map((f, i) => (
            <div key={`${f.name}-${i}`}>
              <div
                className={cn(
                  "group relative -mx-2 cursor-grab rounded-lg border border-transparent p-2 transition-colors active:cursor-grabbing",
                  "hover:border-border hover:bg-accent/30",
                  selected === i && "border-[--studio-accent] bg-[--studio-accent]/5 ring-1 ring-[--studio-accent]/30",
                  f.showIf && selected !== i && "border-l-2 border-l-dashed border-l-muted-foreground/30",
                )}
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
                {f.showIf && (
                  <span className="absolute -top-2 right-2 z-10 rounded-full border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    conditional
                  </span>
                )}
                <div className="pointer-events-none [&_.ki-form-item]:mb-0">
                  <KiForm key={fields.map((x) => x.name).join("|")} fields={[f]} theme={theme} variant={variant} />
                </div>
                <div
                  className={cn(
                    "absolute -top-2 right-2 z-10 hidden items-center gap-1 group-hover:flex",
                    selected === i && "flex",
                  )}
                >
                  <button
                    type="button"
                    title="Duplicate"
                    aria-label="Duplicate field"
                    className="flex size-6 cursor-pointer items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate(i)
                    }}
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    aria-label="Delete field"
                    className="flex size-6 cursor-pointer items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs hover:bg-destructive hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(i)
                    }}
                  >
                    <Trash2 className="size-3.5" />
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
