import type { Field, FieldType } from "../../src/types"
import { TEMPLATES, type StudioTemplate } from "../lib/templates"
import { Wireframe } from "./BlocksPanel"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"

/**
 * Templates panel: the premade starting points that used to live only in a
 * modal. Each card previews its form as a stack of the same per-field
 * wireframes the Blocks palette uses, so the two tabs read as one system.
 */

/**
 * A card preview shows at most this many wireframe rows. The rest are counted
 * in the corner badge, and the box height stays constant so every card lines up
 * — a variable-height preview made the titles float at different heights.
 */
const PREVIEW_FIELD_LIMIT = 2

function previewFields(template: StudioTemplate): Field[] {
  return template.fields.map((f) => (typeof f === "string" ? { name: f } : f)) as Field[]
}

function TemplatePreview({ fields }: { fields: Field[] }) {
  const shown = fields.slice(0, PREVIEW_FIELD_LIMIT)
  const hidden = fields.length - shown.length
  return (
    <span
      aria-hidden="true"
      className="relative flex h-16 w-[76px] shrink-0 items-start overflow-hidden rounded-lg border border-border/70 bg-muted/40 py-1.5"
    >
      {/* Scaled down so the rows fit the constant box at any field count. */}
      <span data-testid="template-preview-rows" className="flex origin-top-left flex-col gap-1.5 scale-[0.72]">
        {shown.map((field, i) => (
          <Wireframe key={`${field.name}-${i}`} type={(field.type ?? "text") as FieldType} />
        ))}
      </span>
      {hidden > 0 && (
        <span className="absolute right-1 bottom-1 rounded bg-background/85 px-1 text-[9px] font-semibold text-muted-foreground">
          +{hidden}
        </span>
      )}
    </span>
  )
}

export type TemplatesPanelProps = {
  onPick: (id: string) => void
}

export function TemplatesPanel({ onPick }: TemplatesPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Pick a starting point — every field stays editable on the canvas.
      </p>

      <div className="flex flex-col gap-2">
        {TEMPLATES.map((t) => {
          const fields = previewFields(t)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              className={cn(
                "group flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-card p-2.5 text-left shadow-xs transition-all duration-150",
                "hover:border-studio-accent hover:shadow-md",
              )}
            >
              <TemplatePreview fields={fields} />
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm font-semibold tracking-tight text-foreground group-hover:text-studio-accent">
                    {t.name}
                  </strong>
                  <Badge variant="secondary">{fields.length}</Badge>
                </span>
                <span className="text-xs leading-snug text-muted-foreground">{t.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
