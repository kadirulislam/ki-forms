import { useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

/**
 * Collapsible panel section.
 *
 * The single biggest thing separating a calm inspector from a wall of inputs:
 * a form with 30 always-visible controls reads as noise, and the eye cannot
 * find the one it needs. Collapsing to labelled rows means the panel is a short
 * scannable list, and the cost is one click on the thing you actually want.
 *
 * The open/close transition animates `grid-template-rows` from 0fr to 1fr, so
 * the content's own height is respected — animating `height` would need a
 * measured pixel value and would fight any reflow inside the section.
 */

export type PanelSectionProps = {
  title: string
  children: ReactNode
  /** Start open. Only the first section of a panel should. */
  defaultOpen?: boolean
  /** Extra words the section's search should also match on. */
  keywords?: string[]
  /**
   * A small filled dot on the header, meaning "you have changed something
   * here". Lets a collapsed section advertise that it is non-default without
   * being open.
   */
  active?: boolean
  className?: string
  headerClassName?: string
}

export function PanelSection({
  title,
  children,
  defaultOpen = false,
  keywords = [],
  active = false,
  className,
  headerClassName,
}: PanelSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = `panel-section-${title.replace(/\W+/g, "-").toLowerCase()}`

  return (
    <section className={cn("border-b border-border/60 last:border-b-0", className)} data-section={title} data-keywords={keywords.join(" ")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/50",
          headerClassName,
        )}
      >
        <ChevronRight
          className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-90")}
        />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">{title}</span>
        {active && <span className="size-1.5 shrink-0 rounded-full bg-studio-accent" style={{ backgroundColor: "var(--studio-accent)" }} />}
      </button>
      <div
        id={panelId}
        className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 px-3 pb-4 pt-0.5">{children}</div>
        </div>
      </div>
    </section>
  )
}
