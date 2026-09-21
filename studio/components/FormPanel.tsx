import { cn } from "../lib/utils"
import { isAppsScriptUrl, isHttpUrl } from "../lib/sheets"
import { Rows3, MessagesSquare, Database, ShieldCheck, ExternalLink, X } from "lucide-react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"

export type FormPanelProps = {
  formTitle: string
  onTitleChange: (title: string) => void
  variant: "classic" | "conversational"
  onVariantChange: (variant: "classic" | "conversational") => void
  endpoint?: string
  onEndpointChange: (endpoint: string | undefined) => void
  onOpenSheets: () => void
}

export function FormPanel({
  formTitle,
  onTitleChange,
  variant,
  onVariantChange,
  endpoint,
  onEndpointChange,
  onOpenSheets,
}: FormPanelProps) {
  const valid = endpoint === undefined || endpoint === "" || isHttpUrl(endpoint)
  const isSheets = !!endpoint && isAppsScriptUrl(endpoint)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <Label htmlFor="form-name" className="text-xs text-muted-foreground">Form name</Label>
        <Input
          id="form-name"
          type="text"
          value={formTitle}
          placeholder="Untitled form"
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">Layout</div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "classic", icon: <Rows3 />, name: "Classic", desc: "All fields on one page" },
              { id: "conversational", icon: <MessagesSquare />, name: "Conversational", desc: "One question per step" },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={variant === v.id}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                "hover:bg-accent",
                variant === v.id && "border-studio-accent bg-accent ring-1 ring-studio-accent/30",
              )}
              onClick={() => onVariantChange(v.id)}
            >
              <span className="text-studio-accent [&_svg]:size-4" style={{ color: "var(--studio-accent)" }}>{v.icon}</span>
              <strong className="text-sm font-medium">{v.name}</strong>
              <span className="text-xs text-muted-foreground">{v.desc}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {variant === "conversational"
            ? 'Exports with variant="conversational" — stepper UI, Enter-to-advance, conditional fields skipped automatically.'
            : "Exports as a single-page form — the classic ki-forms layout."}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="text-xs font-medium text-muted-foreground">Collect responses</div>
        <div className="relative">
          <Input
            id="collect-endpoint"
            type="url"
            className={cn("pr-8", !valid && "border-destructive focus-visible:ring-destructive/30")}
            placeholder="https://… (paste a URL that accepts POST)"
            value={endpoint ?? ""}
            onChange={(e) => onEndpointChange(e.target.value === "" ? undefined : e.target.value)}
            aria-label="Submission endpoint"
            aria-invalid={!valid}
          />
          {endpoint && (
            <button
              type="button"
              aria-label="Clear endpoint"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onEndpointChange(undefined)}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {!valid && (
          <p className="text-[11px] text-destructive">Enter a valid http(s) URL.</p>
        )}
        {valid && isSheets && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-3.5 shrink-0" /> Google Sheets connected — every submit adds a row.
          </p>
        )}

        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Database className="size-3.5 text-studio-accent" style={{ color: "var(--studio-accent)" }} />
            No backend? Use Google Sheets
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Paste a 20-line script into your Sheet once — submissions land as rows. No account, no server.
          </p>
          <Button variant="outline" size="sm" className="self-start" onClick={onOpenSheets}>
            <ExternalLink /> Set up Google Sheets…
          </Button>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Also works with Formspree, Web3Forms, Basin, Discord &amp; automation webhooks — anything that accepts a JSON
          POST.
        </p>
      </section>
    </div>
  )
}
