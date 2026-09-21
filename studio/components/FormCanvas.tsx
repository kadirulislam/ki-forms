import { useDndContext, useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { BLOCK_TYPE_LABELS } from "./BlocksPanel"
import { CSS } from "@dnd-kit/utilities"
import type { Field, KiTheme } from "../../src/types"
import { applyDefaults } from "../../src/utils/defaults"
import { themeToCssVars } from "../../src/theme"
import { cn } from "../lib/utils"
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Globe,
  GripVertical,
  Phone,
  Sparkles,
  Trash2,
  Sparkle,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"

/** Small readonly control preview mirroring the lib's real defaulting and theme styles. */
export function FieldPreview({ field, theme }: { field: Field; theme?: KiTheme }) {
  const f = applyDefaults(field)
  const type = (f.type || "text") as string
  const labelText = typeof f.label === "string" ? f.label : f.name

  const customStyle = {
    borderColor: theme?.borderColor || undefined,
    borderRadius: theme?.radius || undefined,
    background: theme?.surfaceColor || undefined,
    color: theme?.textColor || undefined,
  }

  if (type === "checkbox") {
    return (
      <div className="flex items-center gap-3 py-1">
        <span
          className="flex size-5 shrink-0 items-center justify-center border border-input bg-card shadow-2xs transition-colors"
          style={{
            borderColor: theme?.borderColor || undefined,
            borderRadius: theme?.radius ? `calc(${theme.radius} * 0.75)` : undefined,
            background: theme?.surfaceColor || undefined,
          }}
        >
          {f.defaultValue ? (
            <Check className="size-3.5 text-[--studio-accent]" style={{ color: theme?.accentColor || undefined }} />
          ) : null}
        </span>
        <span className="truncate text-sm font-medium text-foreground" style={{ color: theme?.textColor || undefined }}>
          {labelText}
        </span>
        {f.helperText && (
          <span className="truncate text-xs text-muted-foreground" style={{ color: theme?.helperColor || undefined }}>
            · {f.helperText}
          </span>
        )}
      </div>
    )
  }

  if (type === "select") {
    const opts = Array.isArray(f.options) ? f.options : []
    const labelOf = (o: unknown) => (typeof o === "string" ? o : (o as { label: string }).label)
    return (
      <div className="space-y-1.5">
        <span
          className="ki-label block text-xs font-semibold tracking-tight text-foreground"
          style={{ color: theme?.textColor || undefined, fontFamily: theme?.fontFamily || undefined }}
        >
          {labelText}
        </span>
        <div
          className="flex h-10 w-full items-center justify-between border border-input bg-card px-3.5 text-sm text-foreground shadow-2xs transition-colors"
          style={customStyle}
        >
          <span className="truncate opacity-80">
            {opts.length ? `${labelOf(opts[0])}${opts.length > 1 ? `  +${opts.length - 1}` : ""}` : "Select option..."}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </div>
        {f.helperText && (
          <span className="ki-helper block text-[11px] text-muted-foreground" style={{ color: theme?.helperColor || undefined }}>
            {f.helperText}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <span
        className="ki-label block text-xs font-semibold tracking-tight text-foreground"
        style={{ color: theme?.textColor || undefined, fontFamily: theme?.fontFamily || undefined }}
      >
        {labelText}
      </span>
      <div
        className={cn(
          "flex w-full items-center border border-input bg-card px-3.5 shadow-2xs transition-colors text-foreground",
          type === "textarea" ? "min-h-20 py-2.5 items-start" : "h-10",
        )}
        style={customStyle}
      >
        <span className="truncate text-sm text-muted-foreground flex-1">
          {f.placeholder || (type === "date" ? "YYYY-MM-DD" : type === "tel" ? "+1 (555) 000-0000" : "")}
        </span>
        {type === "date" && <Calendar className="size-4 shrink-0 opacity-60 ml-2" />}
        {type === "tel" && <Phone className="size-4 shrink-0 opacity-60 ml-2" />}
        {type === "url" && <Globe className="size-4 shrink-0 opacity-60 ml-2" />}
      </div>
      {f.helperText && (
        <span className="ki-helper block text-[11px] text-muted-foreground" style={{ color: theme?.helperColor || undefined }}>
          {f.helperText}
        </span>
      )}
    </div>
  )
}

type SortableFieldCardProps = {
  field: Field
  theme?: KiTheme
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
  theme,
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
        "group relative my-2.5 rounded-xl border transition-all duration-150",
        selected
          ? "border-2 border-dashed border-studio-accent bg-studio-accent-subtle shadow-xs"
          : "border-border/80 bg-card hover:border-border hover:shadow-xs",
        isDragging && "opacity-25",
      )}
    >
      {/* Active selection tag pinned at top-right */}
      {selected && (
        <div className="absolute -top-3 right-4 z-20 flex items-center gap-1.5 pointer-events-none">
          <span
            className="rounded-md bg-studio-accent px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white shadow-xs"
            style={{ backgroundColor: "var(--studio-accent)", color: "#ffffff" }}
          >
            {BLOCK_TYPE_LABELS[field.type || "text"] ?? field.type}
          </span>
        </div>
      )}

      {/* Reorder grip handle on the left */}
      <button
        type="button"
        aria-label={`Reorder ${field.name}`}
        {...attributes}
        {...listeners}
        className={cn(
          "absolute -left-7 top-1/2 z-10 flex size-6 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/0 transition-colors",
          "group-hover:text-muted-foreground hover:!text-foreground active:cursor-grabbing",
          selected && "text-muted-foreground",
        )}
      >
        <GripVertical className="size-4" />
      </button>

      {/* Floating action bar on hover/selected */}
      <div
        className={cn(
          "absolute -top-3.5 left-4 z-20 hidden items-center gap-1 group-hover:flex",
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
          <span className="flex items-center gap-1 rounded-md border border-border/80 bg-card px-2 py-0.5 text-[10px] font-medium text-foreground shadow-2xs">
            <Sparkle className="size-2.5 text-studio-accent" style={{ color: "var(--studio-accent)" }} /> condition
          </span>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Field ${field.name}`}
        className="cursor-pointer p-4 outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/30 rounded-xl"
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
        <FieldPreview field={field} theme={theme} />
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
            "flex size-6.5 cursor-pointer items-center justify-center rounded-md border border-border/80 bg-card text-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            danger && "hover:border-destructive/30 hover:bg-destructive hover:text-white",
          )}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  )
}

function EndDropZone({ dragging }: { dragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end", disabled: !dragging })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mt-3 flex items-center justify-center rounded-xl border-2 border-dashed text-xs font-medium transition-all",
        dragging ? "min-h-16 py-4" : "min-h-8 border-transparent",
        isOver && dragging
          ? "border-studio-accent bg-studio-accent-subtle text-studio-accent"
          : "border-border/60 text-muted-foreground/60",
      )}
    >
      {dragging ? "+ Drop block here" : ""}
    </div>
  )
}

export type FormCanvasProps = {
  fields: Field[]
  theme?: KiTheme
  selected: number | null
  onSelect: (index: number | null) => void
  onMove: (index: number, delta: -1 | 1) => void
  onDuplicate: (index: number) => void
  onDelete: (index: number) => void
  onOpenTemplates: () => void
}

/**
 * Modern design studio canvas with solid contrast and reactive theme styles.
 */
export function FormCanvas({
  fields,
  theme,
  selected,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onOpenTemplates,
}: FormCanvasProps) {
  const { active } = useDndContext()
  const dragging = !!active

  const cssVars = themeToCssVars(theme)

  return (
    <div
      className="relative p-5 sm:p-8 ki-form rounded-2xl sm:rounded-3xl transition-colors bg-card text-foreground"
      style={{
        ...cssVars,
        backgroundColor: theme?.surfaceColor || undefined,
        color: theme?.textColor || undefined,
        fontFamily: theme?.fontFamily || undefined,
      }}
    >
      {/* Top designer capsule badge on the canvas */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-3.5 py-1 text-xs font-medium text-foreground shadow-2xs">
          <span
            className="size-2 rounded-full animate-pulse"
            style={{ backgroundColor: theme?.accentColor || "var(--studio-accent)" }}
          />
          <span className="font-semibold text-foreground">ki-forms</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground text-[11px]">interactive canvas</span>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/80 p-8 text-center bg-card">
          <div className="flex size-12 items-center justify-center rounded-full bg-studio-accent-subtle text-studio-accent">
            <Sparkles className="size-6" />
          </div>
          <strong className="text-base font-semibold text-foreground">Your form is empty</strong>
          <span className="max-w-xs text-xs text-muted-foreground">
            Drag a block from the left panel, or kickstart with a ready-to-use template.
          </span>
          <button
            type="button"
            className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-studio-accent hover:text-studio-accent"
            onClick={(e) => {
              e.stopPropagation()
              onOpenTemplates()
            }}
          >
            <Sparkles className="size-3.5 text-studio-accent" /> Start from a template
          </button>
        </div>
      ) : (
        <>
          <SortableContext items={fields.map((f) => f.name)} strategy={verticalListSortingStrategy}>
            {fields.map((f, i) => (
              <SortableFieldCard
                key={f.name}
                field={f}
                theme={theme}
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
