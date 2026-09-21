import { useDraggable } from "@dnd-kit/core"
import { useState } from "react"
import type { FieldType } from "../../src/types"
import { cn } from "../lib/utils"
import {
  AtSign,
  CheckSquare,
  ChevronDownSquare,
  GripVertical,
  Hash,
  Info,
  KeyRound,
  Search,
  Type,
  AlignLeft,
} from "lucide-react"

const BLOCKS: { type: FieldType; label: string; group: "basic" | "choice"; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", group: "basic", icon: <Type /> },
  { type: "email", label: "Email", group: "basic", icon: <AtSign /> },
  { type: "password", label: "Password", group: "basic", icon: <KeyRound /> },
  { type: "number", label: "Number", group: "basic", icon: <Hash /> },
  { type: "textarea", label: "Message", group: "basic", icon: <AlignLeft /> },
  { type: "select", label: "Dropdown", group: "choice", icon: <ChevronDownSquare /> },
  { type: "checkbox", label: "Checkbox", group: "choice", icon: <CheckSquare /> },
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
        "group flex cursor-grab touch-none select-none items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm shadow-xs transition-colors",
        "hover:border-[--studio-accent]/50 hover:bg-accent active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
      <span className="text-[--studio-accent] [&_svg]:size-4">{block.icon}</span>
      <span className="truncate">{block.label}</span>
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
