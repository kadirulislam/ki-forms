import { useEffect, useState } from "react"
import type { Field, KiTheme } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import { toJson, toReactSnippet } from "../lib/export"
import { validateSchema } from "../lib/schema"
import { TEMPLATES } from "../lib/templates"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"
import { Check, FileJson, FileCode2 } from "lucide-react"

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])
}

export type TemplatesModalProps = {
  onPick: (id: string) => void
  onClose: () => void
}

export function TemplatesModal({ onPick, onClose }: TemplatesModalProps) {
  useEscape(onClose)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>Pick a schema — everything stays editable on the canvas.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
              )}
              onClick={() => onPick(t.id)}
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm font-medium">{t.name}</strong>
                <Badge variant="secondary">{t.fields.length} fields</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{t.description}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type CodeModalProps = {
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  onApplyJson: (fields: Field[]) => void
  onClose: () => void
}

export function CodeModal({ fields, theme, variant, onApplyJson, onClose }: CodeModalProps) {
  useEscape(onClose)
  const [tab, setTab] = useState<"json" | "react">("json")
  const [text, setText] = useState(() => toJson(fields))
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const apply = () => {
    try {
      const parsed: unknown = JSON.parse(text)
      const result = validateSchema(parsed)
      if (result.ok) {
        onApplyJson(result.fields)
        setError(null)
        onClose()
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(`Unexpected token — ${(err as Error).message}`)
    }
  }

  const snippet = toReactSnippet("MyForm", fields, { theme, variant })

  const copy = () => {
    const text2 = tab === "json" ? toJson(fields) : snippet
    navigator.clipboard.writeText(text2).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base">Export &amp; import</DialogTitle>
            <div className="flex items-center gap-2">
              {tab === "json" && (
                <Button size="sm" onClick={apply}>
                  Apply changes
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check /> : null} {copied ? "copied!" : "copy"}
              </Button>
            </div>
          </div>
          <DialogDescription className="sr-only">Copy or edit the form schema and React code</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "json" | "react")} className="flex min-h-0 flex-1 flex-col gap-0">
          <div className="border-b p-2">
            <TabsList>
              <TabsTrigger value="json">
                <FileJson /> Schema JSON
              </TabsTrigger>
              <TabsTrigger value="react">
                <FileCode2 /> React component
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="json" className="flex min-h-0 flex-1 flex-col gap-2 p-4">
            <textarea
              className="min-h-0 flex-1 resize-none rounded-md border border-input bg-muted/30 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-[--studio-accent] focus-visible:ring-[--studio-accent]/30 focus-visible:ring-[3px]"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                ✕ {error}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">✓ valid schema — press “Apply changes” to sync the canvas</div>
            )}
          </TabsContent>

          <TabsContent value="react" className="min-h-0 flex-1 overflow-auto p-4">
            <pre className="rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">{snippet}</pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export type PreviewOverlayProps = {
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  device: "desktop" | "mobile"
  onClose: () => void
}

export function PreviewOverlay({ fields, theme, variant, device, onClose }: PreviewOverlayProps) {
  useEscape(onClose)
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div
        className={cn(
          "flex max-h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
          device === "mobile" ? "max-w-[420px]" : "max-w-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
          <Badge variant="secondary">{device === "mobile" ? "Mobile · 390px" : "Desktop"}</Badge>
          <Badge variant="secondary">{variant === "conversational" ? "Conversational" : "Classic"}</Badge>
          <span className="ml-auto text-xs text-muted-foreground">This is exactly what your users will see</span>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <KiForm
            fields={fields}
            theme={theme}
            variant={variant}
            onSubmit={(values) => setResult(JSON.stringify(values, null, 2))}
          />
          {result && (
            <div className="mt-4 rounded-lg border p-3">
              <strong className="text-sm">onSubmit received</strong>
              <pre className="mt-1 overflow-auto font-mono text-xs">{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
