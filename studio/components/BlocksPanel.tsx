import type { FieldType } from "../../src/types"
import { cn } from "../lib/utils"
import { Type, AtSign, KeyRound, Hash, AlignLeft, ChevronDownSquare, CheckSquare, GripVertical, Info } from "lucide-react"

const BLOCKS: { type: FieldType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <Type /> },
  { type: "email", label: "Email", icon: <AtSign /> },
  { type: "password", label: "Password", icon: <KeyRound /> },
  { type: "number", label: "Number", icon: <Hash /> },
  { type: "textarea", label: "Textarea", icon: <AlignLeft /> },
  { type: "select", label: "Select", icon: <ChevronDownSquare /> },
  { type: "checkbox", label: "Checkbox", icon: <CheckSquare /> },
]

export type BlocksPanelProps = {
  onAdd: (fieldType: string) => void
}

export function BlocksPanel({ onAdd }: BlocksPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-muted-foreground">Drag &amp; drop elements</div>
      <div className="grid grid-cols-2 gap-2">
        {BLOCKS.map((b) => (
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
      </div>
      <div className="flex gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>
          <strong className="font-medium text-foreground">Tip:</strong> Drag blocks directly to any position on the
          canvas or click to append.
        </span>
      </div>
    </div>
  )
}
