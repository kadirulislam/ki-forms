import { useDraggable } from "@dnd-kit/core"
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDownSquare,
  Hash,
  Link,
  Lock,
  Mail,
  Phone,
  Type,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import type { FieldType } from "../../src/types"
import { cn } from "../lib/utils"
import { Info, Search, Move } from "lucide-react"

/** Modern high-fidelity wireframe thumbnail per field type matching modern design editors.
 *  Exported so the Templates panel can stack the same rows into a form-level preview. */
export function Wireframe({ type, active }: { type: FieldType; active?: boolean }) {
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

/**
 * Glyph for a compact palette row.
 *
 * This is deliberately an icon, not a `Wireframe`. The wireframes are built for
 * a ~100x48 card — they use `w-full`, `px-2` and `h-6` — so squeezed into a
 * 20px row they collapse into unrecognisable blobs of different shapes. Icons
 * are designed to hold their size, so the row stays scannable. The wireframes
 * still earn their keep on the template cards, which are large enough.
 */
const BLOCK_ICONS: Record<string, LucideIcon> = {
  text: Type,
  email: Mail,
  password: Lock,
  tel: Phone,
  url: Link,
  number: Hash,
  date: Calendar,
  textarea: AlignLeft,
  select: ChevronDownSquare,
  checkbox: CheckSquare,
}

/**
 * One palette entry.
 *
 * These used to be 130px wireframe cards in a two-column grid, which pushed the
 * field list and the drag hint off-screen and made the palette the loudest
 * thing in the editor. A 32px row holds the same ten types in a third of the
 * height, and once the panel is compact the canvas -- the thing being worked
 * on -- gets the space back.
 */
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
  const Icon = BLOCK_ICONS[block.type] ?? Type

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={() => onAdd(block.type)}
      className={cn(
        "group flex h-8 w-full cursor-grab touch-none select-none items-center gap-2 rounded-md border border-transparent px-2",
        "text-left transition-colors hover:border-border/70 hover:bg-accent/60 active:cursor-grabbing",
        isDragging && "border-dashed border-studio-accent bg-studio-accent-subtle opacity-50",
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      <span className="truncate text-xs font-medium text-foreground/85">{block.label}</span>
      <Move
        aria-hidden="true"
        className="ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
      />
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks"
          aria-label="Search blocks"
          className="h-8 w-full rounded-md border border-input bg-card pl-2.5 pr-7 text-xs outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/20"
        />
        <Search className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
      </div>

      {/* A single column of rows, not a grid of cards: the same ten types in a
          third of the height, and the panel stops competing with the canvas. */}
      <div className="flex flex-col gap-0.5">
        {visible.map((b) => (
          <PaletteCard key={b.type} block={b} onAdd={onAdd} />
        ))}
        {visible.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No blocks match “{query}”.</p>
        )}
      </div>

      <p className="mt-auto flex items-start gap-1.5 pt-1 text-[11px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" />
        <span>Click to append, or drag onto the canvas.</span>
      </p>
    </div>
  )
}
