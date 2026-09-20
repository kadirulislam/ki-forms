import type { KiTheme } from "../../src/types"
import { SHADCN_PRESETS, type ShadcnPreset } from "../lib/shadcn-presets"
import { cn } from "../lib/utils"
import { Check, Sun, Moon, RotateCcw, X } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"

export type StylePanelProps = {
  theme: KiTheme
  preset: ShadcnPreset | null
  presetDark: boolean
  onPreset: (p: ShadcnPreset | null) => void
  onPresetMode: () => void
  onTokens: (theme: KiTheme) => void
  onClearPreset: () => void
}

const TOKENS: { key: keyof KiTheme; label: string; kind: "color" | "text"; fallback: string }[] = [
  { key: "accentColor", label: "Accent", kind: "color", fallback: "#6366f1" },
  { key: "textColor", label: "Text", kind: "color", fallback: "#0f172a" },
  { key: "borderColor", label: "Border", kind: "color", fallback: "#d1d5db" },
  { key: "surfaceColor", label: "Surface", kind: "color", fallback: "#ffffff" },
  { key: "errorColor", label: "Error", kind: "color", fallback: "#dc2626" },
  { key: "helperColor", label: "Helper text", kind: "color", fallback: "#6b7280" },
  { key: "radius", label: "Corner radius", kind: "text", fallback: "6px" },
  { key: "fontFamily", label: "Font family", kind: "text", fallback: "inherit" },
]

export function StylePanel({ theme, preset, presetDark, onPreset, onPresetMode, onTokens, onClearPreset }: StylePanelProps) {
  const setColor = (key: keyof KiTheme, value: string) => onTokens({ ...theme, [key]: value })
  const clearToken = (key: keyof KiTheme) => {
    const next = { ...theme }
    delete next[key]
    onTokens(next)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- shadcn presets ---------- */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">shadcn/ui themes</div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 transition-opacity",
              !preset && "pointer-events-none opacity-40",
            )}
          >
            <Sun className="size-3 text-muted-foreground" />
            <Switch checked={presetDark} onCheckedChange={onPresetMode} aria-label="Toggle preset light/dark" />
            <Moon className="size-3 text-muted-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {SHADCN_PRESETS.map((p) => {
            const t = presetDark ? p.dark : p.light
            const active = preset?.id === p.id
            return (
              <button
                key={p.id}
                type="button"
                title={`shadcn ${p.name}`}
                aria-pressed={active}
                className={cn(
                  "relative flex h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border transition-all",
                  "hover:scale-[1.04] hover:shadow-sm",
                  active && "border-[--studio-accent] ring-2 ring-[--studio-accent]/30",
                )}
                style={{ background: t.surfaceColor, borderColor: t.borderColor, color: t.textColor }}
                onClick={() => onPreset(active ? null : p)}
              >
                <span className="h-2.5 w-6 rounded-sm" style={{ background: t.accentColor }} />
                <span className="h-1.5 w-8 rounded-sm" style={{ background: t.borderColor }} />
                {active && (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[--studio-accent] text-white">
                    <Check className="size-2.5" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Real shadcn tokens — the preview and exported <code>theme</code> match what your form looks like inside a
          shadcn/Tailwind app{preset ? "" : ". Pick one to apply"}.
        </p>
      </section>

      <Separator />

      {/* ---------- raw tokens ---------- */}
      <section className="flex flex-col gap-2.5">
        <div className="text-xs font-medium text-muted-foreground">Theme tokens</div>
        {TOKENS.map((t) => {
          const value = theme[t.key]
          const overridden = value !== undefined
          return (
            <div key={t.key} className="flex items-center gap-2">
              <Label className={cn("w-24 shrink-0 text-xs", !overridden && "text-muted-foreground")}>{t.label}</Label>
              {t.kind === "color" ? (
                <div className="flex flex-1 items-center gap-1.5">
                  <input
                    type="color"
                    aria-label={`${t.label} color`}
                    className="size-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                    value={typeof value === "string" ? value : t.fallback}
                    onChange={(e) => setColor(t.key, e.target.value)}
                  />
                  <Input
                    className="h-8 font-mono text-xs"
                    placeholder={t.fallback}
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setColor(t.key, e.target.value)}
                  />
                  {overridden && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 shrink-0"
                      title="Reset to default"
                      aria-label={`Reset ${t.label}`}
                      onClick={() => clearToken(t.key)}
                    >
                      <X />
                    </Button>
                  )}
                </div>
              ) : (
                <Input
                  className="h-8 flex-1 font-mono text-xs"
                  placeholder={t.fallback}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setColor(t.key, e.target.value)}
                />
              )}
            </div>
          )
        })}
        <p className="text-[11px] leading-snug text-muted-foreground">
          Tokens map to <code>--ki-*</code> CSS variables — defaults match the library, so an empty theme looks exactly
          like shipped ki-forms.
        </p>
        {(Object.keys(theme).length > 0 || preset) && (
          <Button variant="outline" size="sm" onClick={() => { onPreset(null); onClearPreset() }}>
            <RotateCcw /> Reset all styling
          </Button>
        )}
      </section>
    </div>
  )
}
