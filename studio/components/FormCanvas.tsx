import { useDndContext, useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Field } from "../../src/types"
import { applyDefaults } from "../../src/utils/defaults"
import { cn } from "../lib/utils"
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  GripHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

/** Small readonly control preview mirroring the lib's real defaulting. */
export function FieldPreview({ field }: { field: Field }) {
  const f = applyDefaults(field)
  const type = (f.type || "text") as string
  const labelText = typeof f.label === "string" ? f.label : f.name

  if (type === "checkbox") {
    return (
      <div className="flex items-center gap-2.5 py-0.5">
        <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input">
          {f.defaultValue ? <Check className="size-3 text-[--studio-accent]" /> : null}
        </span>
        <span className="truncate text-sm text-foreground">{labelText}</span>
        {f.helperText && <span className="truncate text-xs text-muted-foreground">· {f.helperText}</span>}
      </div>
    )
  }

  if (type === "select") {
    const opts = Array.isArray(f.options) ? f.options : []
    const labelOf = (o: unknown) => (typeof o === "string" ? o : (o as { label: string }).label)
    return (
      <div>
        <span className="ki-label block">{labelText}</span>
        <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground shadow-xs">
          <span className="truncate">
            {opts.length ? `${labelOf(opts[0])}${opts.length > 1 ? `  +${opts.length - 1}` : ""}` : "No options"}
          </span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </div>
        {f.helperText && <span className="ki-helper block">{f.helperText}</span>}
      </div>
    )
  }

  return (
    <div>
      <span className="ki-label block">{labelText}</span>
      <div
        className={cn(
          "flex w-full items-center rounded-md border border-input bg-transparent px-3 shadow-xs",
          type === "textarea" ? "min-h-16 py-2" : "h-9",
        )}
      >
        <span className="truncate text-sm text-muted-foreground/70">{f.placeholder || ""}</span>
      </div>
      {f.helperText && <span className="ki-helper block">{f.helperText}</span>}
    </div>
  )
}

type SortableFieldCardProps = {
  field: Field
  index: number
  total: number
  selected: boolean
  dragActive: boolean
  onSelect: () => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}

function SortableFieldCard({
  field,
  index,
  total,
  selected,
  dragActive,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
}: SortableFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.name,
    disabled: !field.name,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative my-1 rounded-lg border border-transparent transition-colors",
        "hover:border-border hover:bg-accent/30",
        selected && "border-[--studio-accent] bg-[--studio-accent]/5 ring-1 ring-[--studio-accent]/30",
        isDragging && "opacity-30",
      )}
    >
      {/* grip — the only drag-activation handle */}
      <button
        type="button"
        aria-label={`Reorder ${field.name}`}
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-7 top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/0 shadow-xs transition-colors",
          "group-hover:text-muted-foreground/80 hover:!text-muted-foreground active:cursor-grabbing",
          selected && "text-muted-foreground/80",
        )}
      >
        <GripHorizontal className="size-4" />
      </button>

      {/* hover/selected action cluster */}
      <div
        className={cn(
          "absolute -top-3 right-2 z-10 hidden items-center gap-1 group-hover:flex",
          selected && "flex",
          dragActive && "!hidden",
        )}
      >
        <ActionBtn label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="size-3.5" />
        </ActionBtn>
        <ActionBtn label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
          <ArrowDown className="size-3.5" />
        </ActionBtn>
        <ActionBtn label="Duplicate" onClick={onDuplicate}>
          <Copy className="size-3.5" />
        </ActionBtn>
        <ActionBtn label="Delete" danger onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </ActionBtn>
        {field.showIf && (
          <span className="rounded-full border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
            conditional
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Field ${field.name}`}
        className="cursor-pointer px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[--studio-accent]/40"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSelect()
          }
        }}
      >
        <FieldPreview field={field} />
      </div>
    </div>
  )
}

function ActionBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          title={label}
          aria-label={label}
          disabled={disabled}
          className={cn(
            "flex size-6 cursor-pointer items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            danger && "hover:bg-destructive hover:text-white",
          )}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function EndDropZone({ dragging }: { dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end", disabled: !dragging })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mt-1 flex items-center justify-center rounded-lg border-2 border-dashed text-xs transition-all",
        dragging ? "min-h-14" : "min-h-6 border-transparent",
        isOver && dragging
          ? "border-[--studio-accent] bg-[--studio-accent]/5 text-muted-foreground"
          : "border-border/50 text-muted-foreground/50",
      )}
    >
      {dragging ? "Drop field here" : ""}
    </div>
  )
}

export type FormCanvasProps = {
  fields: Field[]
  selected: number | null
  onSelect: (index: number | null) => void
  onMove: (index: number, delta: -1 | 1) => void
  onDuplicate: (index: number) => void
  onDelete: (index: number) => void
  onOpenTemplates: () => void
}

/**
 * Formester-style canvas: every field is a card with a grip handle and hover
 * actions; palette items and cards share one dnd-kit context, so dragging
 * works with mouse, pen and touch. Reordering happens live during the drag.
 */
export function FormCanvas({
  fields,
  selected,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onOpenTemplates,
}: FormCanvasProps) {
  const { active } = useDndContext()
  const dragging = !!active

  return (
    <div className="relative p-4 sm:p-6">
      {fields.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center">
          <Sparkles className="size-5 text-[--studio-accent]" />
          <strong className="text-sm font-medium">Your form is empty</strong>
          <span className="text-xs text-muted-foreground">Drag a block from the left, or start from a template</span>
          <button
            type="button"
            className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium shadow-xs transition-colors hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation()
              onOpenTemplates()
            }}
          >
            <Sparkles className="size-3.5 text-[--studio-accent]" /> Start from a template
          </button>
        </div>
      ) : (
        <>
          <SortableContext items={fields.map((f) => f.name)} strategy={verticalListSortingStrategy}>
            {fields.map((f, i) => (
              <SortableFieldCard
                key={f.name}
                field={f}
                index={i}
                total={fields.length}
                selected={selected === i}
                dragActive={dragging}
                onSelect={() => onSelect(i)}
                onMove={(delta) => onMove(i, delta)}
                onDuplicate={() => onDuplicate(i)}
                onDelete={() => onDelete(i)}
              />
            ))}
          </SortableContext>
          <EndDropZone dragging={dragging} />
        </>
      )}
    </div>
  )
}
