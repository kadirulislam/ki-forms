import type { Field } from "../../src/types"
import { Blocks, GitBranch, Link2, Palette, Rows3, Type } from "lucide-react"

/**
 * What the right column shows when no field is selected.
 *
 * The column is permanently docked now, so it cannot simply disappear — and a
 * bare "nothing selected" notice would be a wasted 336px. Instead it becomes a
 * read-only summary of the document, which is genuinely useful: it is the one
 * place that answers "what have I actually built, and is it wired up?" without
 * the user having to click through the left panel to find out.
 */

export type FormOverviewProps = {
  title?: string
  fields: Field[]
  variant: "classic" | "conversational"
  endpoint?: string
  hasCustomCss: boolean
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  )
}

export function FormOverview({ title, fields, variant, endpoint, hasCustomCss }: FormOverviewProps) {
  const conditional = fields.filter((f) => f.showIf !== undefined).length
  const types = new Set(fields.map((f) => f.type ?? "text"))

  // Built as single strings rather than interpolated JSX: adjacent expressions
  // become separate text nodes, which renders with stray whitespace and makes
  // the value impossible to select or assert on as one thing.
  const fieldSummary = fields.length === 0 ? "None yet" : `${fields.length} · ${types.size} ${types.size === 1 ? "type" : "types"}`
  const conditionSummary =
    conditional === 0 ? "None" : `${conditional} field${conditional === 1 ? "" : "s"} shown conditionally`

  return (
    <div className="flex flex-col gap-3">
      <Stat icon={<Type className="size-4" />} label="Form" value={title || "Untitled form"} />
      <Stat icon={<Blocks className="size-4" />} label="Fields" value={fieldSummary} />
      <Stat icon={<Rows3 className="size-4" />} label="Layout" value={variant === "conversational" ? "Conversational" : "Classic"} />
      <Stat icon={<GitBranch className="size-4" />} label="Conditions" value={conditionSummary} />
      <Stat
        icon={<Link2 className="size-4" />}
        label="Endpoint"
        value={endpoint ? endpoint : "Not set — submissions are local"}
      />
      <Stat
        icon={<Palette className="size-4" />}
        label="Custom CSS"
        value={hasCustomCss ? "Scoped styles applied" : "None"}
      />

      <p className="mt-1 rounded-lg bg-muted/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Select a field on the canvas to edit it. <strong className="font-semibold text-foreground">Right-click</strong> a field
        for its full action menu — label, width, type, and conditions included.
      </p>
    </div>
  )
}
