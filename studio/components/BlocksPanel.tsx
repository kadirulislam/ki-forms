import { useState } from "react"
import type { FieldType } from "../../src/types"
import { cn } from "../lib/utils"
import {
  Type,
  AtSign,
  KeyRound,
  Hash,
  AlignLeft,
  ChevronDownSquare,
  CheckSquare,
  GripVertical,
  Info,
  Search,
} from "lucide-react"

const BLOCKS: { type: FieldType; label: string; group: "basic" | "choice"; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", group: "basic", icon: <Type /> },
  { type: "email", label: "Email", group: "basic", icon: <AtSign /> },
  { type: "password", label: "Password", group: "basic", icon: <KeyRound /> },
  { type: "number", label: "Number", group: "basic", icon: <Hash /> },
  { type: "textarea", label: "Textarea", group: "basic", icon: <AlignLeft /> },
  { type: "select", label: "Select", group: "choice", icon: <ChevronDownSquare /> },
  { type: "checkbox", label: "Checkbox", group: "choice", icon: <CheckSquare /> },
]

const GROUPS: { id: "basic" | "choice"; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "choice", label: "Choice" },
]

export type BlocksPanelProps = {
  onAdd: (fieldType: string) => void
}

export function BlocksPanel({ onAdd }: BlocksPanelProps) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const visible = BLOCKS.filter(
    (b) => !q || b.label.toLowerCase().includes(q) || b.type.includes(q),
  )
  const [open, setOpen] = useState<{ id: "basic" | "choice" } | null>(null)
  const shown = open ? visible.filter((b) => b.group === open.id) : visible

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

      <div className="flex gap-1">
        {GROUPS.map((g) => {
          const active = open?.id === g.id
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={active}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                active ? "border-[--studio-accent] bg-accent" : "text-muted-foreground hover:bg-accent",
              )}
              onClick={() => setOpen(active ? null : { id: g.id })}
            >
              {g.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {shown.map((b) => (
          <button
            key={b.type}
            type="button"
            className={cn(
              "group flex cursor-grab items-center gap-2 rounded-lg border bg-card px-2.5 py-2 text-sm shadow-xs transition-colors",
              "hover:border-[--studio-accent]/50 hover:bg-accent active:cursor-grabbing",
            )}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-ki-palette", b.type)
              e.dataTransfer.effectAllowed = "copy"
            }}
            onClick={() => onAdd(b.type)}
          >
            <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
            <span className="text-[--studio-accent] [&_svg]:size-4">{b.icon}</span>
            <span className="truncate">{b.label}</span>
          </button>
        ))}
        {shown.length === 0 && (
          <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">No blocks match “{query}”.</p>
        )}
      </div>

      <div className="flex gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <strong className="font-medium text-foreground">Tip:</strong> Drag blocks directly to any position on the
          canvas or click to append. On touch, select a field and use ↑↓ to move it.
        </span>
      </div>
    </div>
  )
}
