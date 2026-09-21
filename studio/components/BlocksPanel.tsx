import { useDraggable } from "@dnd-kit/core"
import { useState } from "react"
import type { FieldType } from "../../src/types"
import { cn } from "../lib/utils"
import { Info, Search } from "lucide-react"

/** Abstract wireframe thumbnail per field type (Untitled-style palette). */
function Wireframe({ type }: { type: FieldType }) {
  const line = "rounded-[2px] bg-foreground/25"
  const box = "rounded-[3px] border border-foreground/25"
  switch (type) {
    case "text":
    case "email":
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <span className={cn(line, "h-[3px] w-3/5")} />
          <span className={cn(box, "h-3.5 w-4/5")} />
        </div>
      )
    case "password":
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <span className={cn(line, "h-[3px] w-2/5")} />
          <span className={cn(box, "flex h-3.5 w-4/5 items-center justify-center gap-0.5")}>
            <span className="size-1 rounded-full bg-foreground/30" />
            <span className="size-1 rounded-full bg-foreground/30" />
            <span className="size-1 rounded-full bg-foreground/30" />
          </span>
        </div>
      )
    case "number":
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <span className={cn(line, "h-[3px] w-1/3")} />
          <span className={cn(box, "flex h-3.5 w-4/5 items-center justify-between px-1")}>
            <span className={cn(line, "h-[2px] w-1/2")} />
            <span className={cn(box, "h-2 w-2")} />
          </span>
        </div>
      )
    case "textarea":
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <span className={cn(line, "h-[3px] w-1/2")} />
          <span className={cn(box, "h-6 w-4/5")}>
            <span className={cn(line, "mt-1 ml-1 block h-[2px] w-2/3")} />
          </span>
        </div>
      )
    case "select":
      return (
        <div className="flex w-full flex-col items-center gap-1">
          <span className={cn(line, "h-[3px] w-1/2")} />
          <span className={cn(box, "flex h-3.5 w-4/5 items-center justify-between px-1")}>
            <span className={cn(line, "h-[2px] w-1/2")} />
            <span className="text-[7px] leading-none text-foreground/40">▾</span>
          </span>
        </div>
      )
    case "checkbox":
      return (
        <div className="flex w-full items-center justify-center gap-1.5">
          <span className={cn(box, "size-3")} />
          <span className={cn(line, "h-[3px] w-2/5")} />
        </div>
      )
  }
}

const BLOCKS: { type: FieldType; label: string; group: "basic" | "choice" }[] = [
  { type: "text", label: "Text", group: "basic" },
  { type: "email", label: "Email", group: "basic" },
  { type: "password", label: "Password", group: "basic" },
  { type: "number", label: "Number", group: "basic" },
  { type: "textarea", label: "Message", group: "basic" },
  { type: "select", label: "Dropdown", group: "choice" },
  { type: "checkbox", label: "Checkbox", group: "choice" },
]

function PaletteCard({
  block,
  onAdd,
}: {
  block: (typeof BLOCKS)[number]
  onAdd: (type: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${block.type}`,
    data: { kind: "palette", fieldType: block.type },
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onAdd(block.type)}
      className={cn(
        "group flex cursor-grab touch-none select-none flex-col items-center gap-2 rounded-lg border bg-card px-2 pb-2.5 pt-3.5 transition-colors",
        "hover:border-[--studio-accent]/60 hover:bg-accent/60 active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <span className="flex h-10 w-full items-center justify-center">
        <Wireframe type={block.type} />
      </span>
      <span className="truncate text-xs font-medium text-foreground/80 group-hover:text-foreground">
        {block.label}
      </span>
    </button>
  )
}

export type BlocksPanelProps = {
  onAdd: (fieldType: string) => void
}

/** Friendly names for drag ghosts + toasts. */
export const BLOCK_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  BLOCKS.map((b) => [b.type, b.label]),
)

/** Field palette: click to append, or drag onto the canvas (touch-friendly). */
export function BlocksPanel({ onAdd }: BlocksPanelProps) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const visible = BLOCKS.filter((b) => !q || b.label.toLowerCase().includes(q) || b.type.includes(q))

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks…"
          aria-label="Search blocks"
          className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-[--studio-accent] focus-visible:ring-[--studio-accent]/30 focus-visible:ring-[3px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {visible.map((b) => (
          <PaletteCard key={b.type} block={b} onAdd={onAdd} />
        ))}
        {visible.length === 0 && (
          <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">No blocks match “{query}”.</p>
        )}
      </div>

      <div className="flex gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <strong className="font-medium text-foreground">Tip:</strong> Click a block to add it, or drag it onto the
          canvas. Grab a field's ⠿ handle to reorder — works with touch too.
        </span>
      </div>
    </div>
  )
}
