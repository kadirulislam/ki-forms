import { useEffect, useState } from "react"
import type { Field, KiTheme } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import { toJson, toReactSnippet } from "../lib/export"
import { validateSchema } from "../lib/schema"
import { TEMPLATES } from "../lib/templates"
import { appsScript, diagnoseNoCors } from "../lib/sheets"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"
import { Check, Copy, FileJson, FileCode2 } from "lucide-react"

function useEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])
}

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        navigator.clipboard
          .writeText(getText())
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
          .catch(() => {})
      }
    >
      {copied ? <Check /> : <Copy />} {copied ? "copied!" : "copy"}
    </Button>
  )
}

export type TemplatesModalProps = {
  onPick: (id: string) => void
  onClose: () => void
}

export function TemplatesModal({ onPick, onClose }: TemplatesModalProps) {
  useEscape(onClose)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
          <DialogDescription>Pick a schema — everything stays editable on the canvas.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
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
  endpoint?: string
  onApplyJson: (fields: Field[]) => void
  onClose: () => void
}

export function CodeModal({ fields, theme, variant, endpoint, onApplyJson, onClose }: CodeModalProps) {
  useEscape(onClose)
  const [tab, setTab] = useState<"json" | "react">("json")
  const [text, setText] = useState(() => toJson(fields))
  const [error, setError] = useState<string | null>(null)

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

  const snippet = toReactSnippet("MyForm", fields, { theme, variant, endpoint })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-base">Export &amp; import</DialogTitle>
            <div className="flex items-center gap-2">
              {tab === "json" && (
                <Button size="sm" onClick={apply}>
                  Apply changes
                </Button>
              )}
              <CopyButton getText={() => (tab === "json" ? toJson(fields) : snippet)} />
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
            <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">{snippet}</pre>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export type SheetsModalProps = {
  onConnect: (url: string) => void
  onClose: () => void
}

export function SheetsModal({ onConnect, onClose }: SheetsModalProps) {
  useEscape(onClose)
  const [script] = useState(() => appsScript())
  const [url, setUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const valid = url === "" || /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url)

  const copy = () => {
    navigator.clipboard
      .writeText(script)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {})
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-base">Collect into Google Sheets</DialogTitle>
          <DialogDescription>
            Four one-time steps. After that, every submission appends a row to your sheet — no server, no keys.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <ol className="mb-4 flex flex-col gap-3 text-sm">
            <li>
              <strong className="font-medium">1.</strong> Open your Google Sheet →{" "}
              <em>Extensions → Apps Script</em>.
            </li>
            <li>
              <strong className="font-medium">2.</strong> Replace everything in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">Code.gs</code> with the script below, then save.
            </li>
            <li>
              <strong className="font-medium">3.</strong> <em>Deploy → New deployment → Web app</em> — Execute as “Me”,
              access “Anyone”. (Deploying with{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">no-cors</code> silently breaks the browser
              request — keep the defaults.)
            </li>
            <li>
              <strong className="font-medium">4.</strong> Copy the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">/exec</code> URL and connect it:
            </li>
          </ol>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-[--studio-accent] focus-visible:ring-[--studio-accent]/30 focus-visible:ring-[3px]"
              placeholder="https://script.google.com/macros/s/…/exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label="Apps Script web app URL"
              aria-invalid={!valid}
            />
            <Button disabled={!valid || url === ""} onClick={() => onConnect(url)}>
              <Check /> Use this URL
            </Button>
          </div>
          {!valid && (
            <p className="mb-3 text-xs text-destructive">That does not look like an Apps Script /exec URL.</p>
          )}
          {diagnoseNoCors(url).length > 0 && url !== "" && valid && (
            <ul className="mb-3 list-disc space-y-1 rounded-md border bg-muted/40 p-3 pl-7 text-xs text-muted-foreground">
              {diagnoseNoCors(url).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Code.gs</span>
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />} {copied ? "copied!" : "copy script"}
            </Button>
          </div>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
            {script}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type PreviewOverlayProps = {
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  endpoint?: string
  device: "desktop" | "mobile"
  onClose: () => void
}

export function PreviewOverlay({ fields, theme, variant, endpoint, device, onClose }: PreviewOverlayProps) {
  useEscape(onClose)
  const [result, setResult] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={onClose}>
      <div
        className={cn(
          "flex max-h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
          device === "mobile" ? "max-w-[420px]" : "max-w-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 shrink-0 items-center gap-2 overflow-x-auto border-b px-3">
          <Badge variant="secondary">{device === "mobile" ? "Mobile · 390px" : "Desktop"}</Badge>
          <Badge variant="secondary">{variant === "conversational" ? "Conversational" : "Classic"}</Badge>
          {endpoint && <Badge variant="secondary">endpoint ✓</Badge>}
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
            This is exactly what your users will see
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <KiForm
            fields={fields}
            theme={theme}
            variant={variant}
            endpoint={endpoint}
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
