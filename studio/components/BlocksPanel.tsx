import { useDraggable } from "@dnd-kit/core"
import { useState } from "react"
import type { FieldType } from "../../src/types"
import { cn } from "../lib/utils"
import { Info, Search, Move } from "lucide-react"

/** Modern high-fidelity wireframe thumbnail per field type matching modern design editors. */
function Wireframe({ type, active }: { type: FieldType; active?: boolean }) {
  const line = "rounded-full bg-foreground/20 transition-colors"
  const box = "rounded-md border border-foreground/25 bg-background/50 transition-colors"
  const accentBox = "rounded-md border border-studio-accent bg-studio-accent-subtle text-studio-accent"

  switch (type) {
    case "text":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-2/5 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-1/3", active && "bg-[--studio-accent]/50")} />
          </div>
        </div>
      )
    case "email":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/3 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-between px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-1/2", active && "bg-[--studio-accent]/50")} />
            <span className="text-[9px] font-mono opacity-50">@</span>
          </div>
        </div>
      )
    case "password":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-2/5 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-center gap-1.5", active && accentBox)}>
            <span className="size-1.5 rounded-full bg-foreground/40" />
            <span className="size-1.5 rounded-full bg-foreground/40" />
            <span className="size-1.5 rounded-full bg-foreground/40" />
            <span className="size-1.5 rounded-full bg-foreground/40" />
          </div>
        </div>
      )
    case "number":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/3 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-between px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-1/3", active && "bg-[--studio-accent]/50")} />
            <div className="flex flex-col gap-0.5 text-[6px] opacity-50">
              <span>▲</span>
              <span>▼</span>
            </div>
          </div>
        </div>
      )
    case "textarea":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/2 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-8 w-full flex flex-col justify-between p-1.5", active && accentBox)}>
            <span className={cn(line, "h-1 w-4/5", active && "bg-[--studio-accent]/50")} />
            <span className={cn(line, "h-1 w-3/5", active && "bg-[--studio-accent]/40")} />
          </div>
        </div>
      )
    case "select":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/2 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-between px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-2/5", active && "bg-[--studio-accent]/50")} />
            <span className="text-[8px] opacity-60">▾</span>
          </div>
        </div>
      )
    case "checkbox":
      return (
        <div className="flex w-full items-center justify-center gap-2 px-2 py-2">
          <div className={cn("size-4 rounded border flex items-center justify-center text-[10px]", active ? accentBox : box)}>
            ✓
          </div>
          <div className="flex flex-col gap-1 w-1/2">
            <span className={cn(line, "h-1 w-full", active && "bg-[--studio-accent]/50")} />
            <span className={cn(line, "h-0.5 w-3/4 opacity-60")} />
          </div>
        </div>
      )
    case "tel":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/3 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-between px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-1/2", active && "bg-[--studio-accent]/50")} />
            <span className="text-[9px] opacity-60">📞</span>
          </div>
        </div>
      )
    case "url":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/3 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-between px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-3/5", active && "bg-[--studio-accent]/50")} />
            <span className="text-[9px] opacity-60">🔗</span>
          </div>
        </div>
      )
    case "date":
      return (
        <div className="flex w-full flex-col items-center gap-1.5 px-2">
          <span className={cn(line, "h-1 w-1/3 self-start ml-1", active && "bg-[--studio-accent]/40")} />
          <div className={cn(box, "h-6 w-full flex items-center justify-between px-2", active && accentBox)}>
            <span className={cn(line, "h-1 w-2/5", active && "bg-[--studio-accent]/50")} />
            <span className="text-[9px] opacity-60">📅</span>
          </div>
        </div>
      )
  }
}

export const BLOCKS: { type: FieldType; label: string; group: "basic" | "choice" }[] = [
  { type: "text", label: "Text", group: "basic" },
  { type: "email", label: "Email", group: "basic" },
  { type: "tel", label: "Phone", group: "basic" },
  { type: "url", label: "Website", group: "basic" },
  { type: "number", label: "Number", group: "basic" },
  { type: "password", label: "Password", group: "basic" },
  { type: "textarea", label: "Message", group: "basic" },
  { type: "select", label: "Dropdown", group: "choice" },
  { type: "checkbox", label: "Checkbox", group: "choice" },
  { type: "date", label: "Date", group: "choice" },
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
        "group relative flex cursor-grab touch-none select-none flex-col items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-all duration-150",
        "hover:border-studio-accent hover:shadow-md hover:-translate-y-0.5 active:cursor-grabbing",
        isDragging && "border-2 border-dashed border-studio-accent bg-studio-accent-subtle opacity-40",
      )}
    >
      {/* 4-way move handle appearing on hover or drag, matching reference image */}
      <span aria-hidden="true" className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-full p-0.5 shadow-xs text-muted-foreground pointer-events-none">
        <Move className="size-3" />
      </span>

      <span aria-hidden="true" className="flex h-12 w-full items-center justify-center pointer-events-none">
        <Wireframe type={block.type} active={isDragging} />
      </span>
      <span className="mt-1 truncate text-xs font-semibold tracking-tight text-foreground/85 group-hover:text-studio-accent transition-colors">
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
    <div className="flex flex-col gap-4">
      {/* Search Blocks with search icon on the right as in the reference image */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Blocks"
          aria-label="Search blocks"
          className="h-9 w-full rounded-lg border border-border bg-card/60 px-3 pr-8 text-xs font-medium shadow-xs outline-none placeholder:text-muted-foreground/80 focus-visible:border-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent/20 transition-all text-foreground"
        />
        <Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((b) => (
          <PaletteCard key={b.type} block={b} onAdd={onAdd} />
        ))}
        {visible.length === 0 && (
          <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">No blocks match “{query}”.</p>
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-accent/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-studio-accent" style={{ color: "var(--studio-accent)" }} />
        <span>
          <strong className="font-semibold text-foreground">Drag & Drop:</strong> Drag blocks onto the canvas or click to append. Grab the move handle on fields to reorder.
        </span>
      </div>
    </div>
  )
}
