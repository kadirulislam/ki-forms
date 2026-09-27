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
      className="relative flex h-[72px] w-[68px] shrink-0 items-start overflow-hidden border border-border bg-muted/40 p-1"
    >
      {/* Natural size, not a scaled-down one. The wireframes are built for
          roughly a 100px card; scaling them to 0.72 inside a 64px box left them
          floating in empty space reading as a single blank rectangle. At 1:1 in
          a box sized to them, the thumbnail looks like the miniature form it
          is meant to be. */}
      <span data-testid="template-preview-rows" className="flex w-full flex-col gap-1.5">
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
                "group relative flex cursor-pointer items-center gap-2.5 border border-border bg-card p-2.5 text-left transition-colors",
                "hover:border-foreground/40",
              )}
            >
              <TemplatePreview fields={fields} />
              {/* pr-8 reserves the corner for the count badge so the badge
                  never competes with the text for width. Sharing the name row
                  truncated every long name ("Contact fo…", "Signup wit…"),
                  and sharing the description row wrapped it to four lines.
                  Out of flow, the name wraps to two lines instead of being cut,
                  and the description stays at two. */}
              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 pr-7">
                <strong className="text-sm font-semibold leading-tight tracking-tight text-foreground">
                  {t.name}
                </strong>
                <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{t.description}</span>
              </span>
              <span className="absolute right-2 top-2 shrink-0">
                <Badge variant="secondary">{fields.length}</Badge>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
