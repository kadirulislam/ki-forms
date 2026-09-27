import { useState } from "react"
import { DeviceFrame, DEVICE_VIEWPORT_LABEL, type DeviceKind } from "./DeviceFrame"
import type { Field, KiTheme } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import { toJson, toRoundTripSnippet, importSchemaBlock, exportReact } from "../lib/export"
import { parseDocumentImport, parseDocumentImportAll, type DocumentImport } from "../lib/schema"
import { PREVIEW_SCOPE_VALUE, scopeCustomCss, validateCustomCss } from "../lib/css"
import { appsScript, diagnoseNoCors } from "../lib/sheets"
import { Tabs, TabsList, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import type { ResizableState } from "../lib/use-resizable"
import {
  StudioModal,
  ModalBody,
  ModalFooterBar,
  ModalSection,
  StudioCopyButton,
  CodeEditor,
  ValidationSummary,
  ConfirmApplyDialog,
  ReadOnlyBadge,
  StudioTab,
  StudioToolbarButton,
  useStudioEscape,
} from "./StudioModal"
import {
  Check,
  FileJson,
  FileCode2,
  RotateCcw,
  Download,
  CheckCheck,
  ClipboardPaste,
  Import,
  Settings2,
  FileType2,
  Monitor,
  Tablet,
  Smartphone,
  Maximize2,
} from "lucide-react"

export { StudioCopyButton as CopyButton }
export { useStudioEscape as useEscape }

export type CodeModalProps = {
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  endpoint?: string
  customCss?: string
  onApplyDocument: (doc: DocumentImport) => void
  onClose: () => void
}

export function CodeModal({ fields, theme, variant, endpoint, customCss = "", onApplyDocument, onClose }: CodeModalProps) {
  type Tab = "json" | "react" | "code" | "settings" | "css"
  const [tab, setTab] = useState<Tab>("json")
  const [text, setText] = useState(() => toJson(fields))
  const [error, setError] = useState<string | null>(null)
  const [withZod, setWithZod] = useState(false)
  const [language, setLanguage] = useState<"tsx" | "jsx">("tsx")
  const [includeTheme, setIncludeTheme] = useState(true)
  const [includeEndpoint, setIncludeEndpoint] = useState(true)
  const [includeMarker, setIncludeMarker] = useState(false)
  const [codeText, setCodeText] = useState("")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [codeApplied, setCodeApplied] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<null | { kind: "json" | "code"; doc: DocumentImport }>(null)

  /** Live validation status for the JSON editor — shows all errors, never applies. */
  const liveJson = (() => {
    try {
      const parsed: unknown = JSON.parse(text)
      const result = parseDocumentImportAll(parsed)
      if (result.ok) return { ok: true as const, doc: result.doc }
      return { ok: false as const, errors: result.errors }
    } catch (err) {
      return { ok: false as const, errors: [`Unexpected token — ${(err as Error).message}`] }
    }
  })()

  const liveCode = (() => {
    if (!codeText.trim()) return null
    const doc = importSchemaBlock(codeText)
    if (!doc) return { ok: false as const, errors: ["No ki-forms schema block found. Paste code exported with the schema marker."] }
    const result = parseDocumentImportAll(doc)
    if (!result.ok) return { ok: false as const, errors: result.errors }
    return { ok: true as const, doc: result.doc }
  })()

  const requestApplyJson = () => {
    try {
      const parsed: unknown = JSON.parse(text)
      const result = parseDocumentImport(parsed)
      if (result.ok) {
        if (fields.length > 0) setConfirm({ kind: "json", doc: result.doc })
        else {
          onApplyDocument(result.doc)
          setError(null)
          onClose()
        }
      } else {
        // Invalid input never replaces the current document.
        setError(result.error)
      }
    } catch (err) {
      setError(`Unexpected token — ${(err as Error).message}`)
    }
  }

  const requestApplyCode = () => {
    const doc = importSchemaBlock(codeText)
    if (!doc) {
      setCodeError("No ki-forms schema block found. Paste code exported with the schema marker.")
      setCodeApplied(null)
      return
    }
    const result = parseDocumentImport(doc)
    if (!result.ok) {
      setCodeError(result.error)
      setCodeApplied(null)
      return
    }
    if (fields.length > 0) setConfirm({ kind: "code", doc: result.doc })
    else {
      onApplyDocument(result.doc)
      setCodeError(null)
      setCodeApplied(`${result.doc.fields.length} fields imported from code`)
      onClose()
    }
  }

  const confirmApply = () => {
    if (!confirm) return
    onApplyDocument(confirm.doc)
    setError(null)
    setCodeError(null)
    if (confirm.kind === "code") setCodeApplied(`${confirm.doc.fields.length} fields imported from code`)
    setConfirm(null)
    onClose()
  }

  const resetJson = () => {
    setText(toJson(fields))
    setError(null)
  }

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText()
      setCodeText(t)
      setCodeError(null)
      setCodeApplied(null)
    } catch {
      setCodeError("Clipboard unavailable — paste manually.")
    }
  }

  const download = (filename: string, content: string, type = "text/plain") => {
    try {
      const blob = new Blob([content], { type })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      // non-fatal
    }
  }

  const exportOptions = {
    theme: includeTheme ? theme : {},
    variant,
    endpoint: includeEndpoint ? endpoint : undefined,
    language,
    validation: withZod ? ("zod" as const) : ("none" as const),
  }
  const snippetResult = exportReact("MyForm", fields, exportOptions)
  const snippet = snippetResult.code
  const roundTrip = toRoundTripSnippet("MyForm", fields, exportOptions)
  const shownReact = includeMarker ? roundTrip : snippet
  const warnings = snippetResult.warnings

  const importPreview = (doc: DocumentImport) => (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <strong className="font-medium text-foreground">{doc.fields.length} fields</strong>
      {doc.fields.length > 0 && <span> — {doc.fields.slice(0, 6).map((f) => f.name).join(", ")}{doc.fields.length > 6 ? ` +${doc.fields.length - 6} more` : ""}</span>}
      <span className="ml-2">· {doc.variant}</span>
      {Object.keys(doc.theme).length > 0 && <span> · {Object.keys(doc.theme).length} theme tokens</span>}
      {doc.endpoint && <span> · endpoint set</span>}
    </div>
  )

  return (
    <StudioModal
      size="lg"
      testId="code-modal"
      onClose={onClose}
      title="Code & Schema"
      description="Export portable schema and React code, or import back into the canvas."
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b p-2">
        <div className="flex min-w-0 items-center gap-2">
          <ReadOnlyBadge label={tab === "json" || tab === "code" ? "editable" : "read-only"} />
          {tab === "react" && warnings.length > 0 && (
            <span className="text-[11px] text-amber-600">{warnings.length} export note{warnings.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === "json" && (
            <>
              <StudioToolbarButton label="Reset" icon={RotateCcw} onClick={resetJson} />
              <StudioToolbarButton label="Download .json" icon={Download} onClick={() => download("form.schema.json", text, "application/json")} />
              <StudioToolbarButton label="Apply changes" icon={CheckCheck} variant="default" onClick={requestApplyJson} />
            </>
          )}
          {tab === "react" && (
            <StudioToolbarButton label="Download .tsx" icon={Download} onClick={() => download("MyForm.tsx", shownReact, "text/plain")} />
          )}
          {tab === "code" && (
            <>
              <StudioToolbarButton label="Paste from clipboard" icon={ClipboardPaste} onClick={pasteFromClipboard} />
              <StudioToolbarButton label="Import from code" icon={Import} variant="default" onClick={requestApplyCode} />
            </>
          )}
          {tab === "css" && customCss !== "" && (
            <StudioToolbarButton label="Download .css" icon={Download} onClick={() => download("form.css", customCss, "text/css")} />
          )}
          {(tab === "json" || tab === "react" || tab === "css") && (
            <StudioCopyButton getText={() => (tab === "json" ? text : tab === "react" ? shownReact : customCss)} />
          )}
        </div>
      </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <div className="shrink-0 border-b p-2">
            {/* Horizontal scroll is the safety net if a future tab needs a
                longer label than the compact one below. */}
            <div className="-mx-1 overflow-x-auto px-1">
              <TabsList aria-label="Code and schema sections" className="w-full sm:w-fit">
                <StudioTab value="json" label="Schema JSON" shortLabel="JSON" icon={FileJson} />
                <StudioTab value="react" label="React component" shortLabel="React" icon={FileCode2} />
                <StudioTab value="code" label="Import code" shortLabel="Import" icon={FileCode2} />
                <StudioTab value="css" label="CSS" shortLabel="CSS" icon={FileType2} />
                <StudioTab value="settings" label="Settings" shortLabel="Settings" icon={Settings2} />
              </TabsList>
            </div>
          </div>

          <TabsContent value="json" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-3 sm:p-4">
            <ModalSection title="Export · editable schema">
            <CodeEditor label="Schema JSON editor" value={text} onChange={(v) => setText(v)} />
            {liveJson.ok ? (
              importPreview(liveJson.doc)
            ) : (
              <ValidationSummary issues={liveJson.errors.map((message) => ({ message }))} />
            )}
            <ValidationSummary error={error} />
            {!error && liveJson.ok && (
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>Accepts a field array or a full document (fields + theme, variant, endpoint) — “Apply changes” asks for confirmation, then syncs the canvas</span>
                <span>Tip: add <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">“$schema”: “ki-forms/schema.json”</code> at the document top level for editor autocomplete — imports ignore it.</span>
              </div>
            )}
            </ModalSection>
          </TabsContent>

          <TabsContent value="react" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-3 sm:p-4">
            <ModalSection title="Export · generated component">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={withZod}
                  onChange={(e) => setWithZod(e.target.checked)}
                  className="size-3.5 accent-[var(--studio-accent)]"
                />
                Include Zod validation (your own zod instance)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={includeMarker}
                  onChange={(e) => setIncludeMarker(e.target.checked)}
                  className="size-3.5 accent-[var(--studio-accent)]"
                />
                Include schema marker (importable)
              </label>
              <StudioCopyButton getText={() => roundTrip} label="copy importable" />
            </div>
            <CodeEditor label="Generated React component" value={snippet} readOnly />
            {warnings.length > 0 && (
              <div role="note" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                <ul className="list-disc space-y-1 pl-5">
                  {warnings.map((w, i) => (
                    <li key={`${w.field}-${i}`}><span className="font-mono">{w.field}</span>: {w.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">“Copy importable” adds a hidden schema block so the component can be pasted back under Import code. Toggle it in Settings or above.</p>
            </ModalSection>
          </TabsContent>

          <TabsContent value="code" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-3 sm:p-4">
            <ModalSection title="Import · from exported code">
            <CodeEditor
              label="Import from code editor"
              value={codeText}
              placeholder="Paste a component copied with “copy importable”…"
              onChange={(v) => { setCodeText(v); setCodeError(null); setCodeApplied(null) }}
            />
            {liveCode?.ok ? importPreview(liveCode.doc) : liveCode ? <ValidationSummary issues={liveCode.errors.map((message) => ({ message }))} /> : null}
            {/* The primary action lives in the toolbar; repeating it here gave the
                pane two identical "Import from code" buttons. */}
            {codeApplied && <p role="status" className="text-xs text-emerald-600">✓ {codeApplied}</p>}
            <ValidationSummary error={codeError} />
            </ModalSection>
          </TabsContent>

          <TabsContent value="css" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-3 sm:p-4">
            <ModalSection title="Export · custom CSS (separate artifact)">
            {customCss === "" ? (
              <p className="text-xs text-muted-foreground">No custom CSS yet — write it in the Style panel. It previews scoped and exports here, never through the ki-forms runtime.</p>
            ) : (
              <>
                <CodeEditor label="Custom CSS export" value={customCss} readOnly />
                <p className="text-[11px] text-muted-foreground">Paste into your app stylesheet and scope it under your own form container. The preview scope is <code className="font-mono">[data-ki-preview=&quot;{PREVIEW_SCOPE_VALUE}&quot;]</code>.</p>
              </>
            )}
            </ModalSection>
          </TabsContent>

          <TabsContent value="settings" className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-4">
            <ModalSection title="Language">
              <div className="flex gap-2" role="radiogroup" aria-label="Export language">
                {(["tsx", "jsx"] as const).map((l) => (
                  <Button key={l} variant={language === l ? "default" : "outline"} size="sm" onClick={() => setLanguage(l)}>
                    {l === "tsx" ? "TypeScript (.tsx)" : "JavaScript (.jsx)"}
                  </Button>
                ))}
              </div>
            </ModalSection>
            <ModalSection title="Include in export">
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={includeTheme} onChange={(e) => setIncludeTheme(e.target.checked)} className="size-3.5 accent-[var(--studio-accent)]" />
                  Theme tokens ({Object.keys(theme).length} set)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={includeEndpoint} onChange={(e) => setIncludeEndpoint(e.target.checked)} className="size-3.5 accent-[var(--studio-accent)]" />
                  Endpoint {endpoint ? `(${endpoint.slice(0, 48)}${endpoint.length > 48 ? "…" : ""})` : "(none set)"}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={withZod} onChange={(e) => setWithZod(e.target.checked)} className="size-3.5 accent-[var(--studio-accent)]" />
                  Zod schema + z.infer type (TS only)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={includeMarker} onChange={(e) => setIncludeMarker(e.target.checked)} className="size-3.5 accent-[var(--studio-accent)]" />
                  Hidden schema marker for round-trip import
                </label>
              </div>
            </ModalSection>
            <ModalSection title="Current document">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {fields.length} fields · {variant} · {Object.keys(theme).length} theme tokens · {endpoint ? "endpoint set" : "no endpoint"}
              </div>
            </ModalSection>
          </TabsContent>
        </Tabs>
      <ConfirmApplyDialog
        open={confirm !== null}
        onConfirm={confirmApply}
        onCancel={() => setConfirm(null)}
      />
    </StudioModal>
  )
}

export type SheetsModalProps = {
  onConnect: (url: string) => void
  onClose: () => void
}

export function SheetsModal({ onConnect, onClose }: SheetsModalProps) {
  const [script] = useState(() => appsScript())
  const [url, setUrl] = useState("")
  const valid = url === "" || /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(url)

  return (
    <StudioModal size="md" testId="sheets-modal" onClose={onClose} title="Collect into Google Sheets" description="Four one-time steps. After that, every submission appends a row to your sheet — no server, no keys.">

      <ModalBody>
        <div className="flex flex-col gap-4">
        <ModalSection title="Setup steps">
          <ol className="flex flex-col gap-3 text-sm">
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
        </ModalSection>

          <ModalSection title="Connect endpoint">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card text-foreground px-3 text-sm shadow-xs outline-none focus-visible:border-studio-accent focus-visible:ring-studio-accent/30 focus-visible:ring-[3px]"
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
          <ValidationSummary error={!valid ? "That does not look like an Apps Script /exec URL." : null} />
          {diagnoseNoCors(url).length > 0 && url !== "" && valid && (
            <ul className="mb-3 list-disc space-y-1 rounded-md border bg-muted/40 p-3 pl-7 text-xs text-muted-foreground">
              {diagnoseNoCors(url).map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
          </ModalSection>

          <ModalSection title="Apps Script source">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Code.gs</span>
            <StudioCopyButton getText={() => script} label="copy script" />
          </div>
          <CodeEditor label="Apps Script source" value={script} readOnly minHeight={200} />
          </ModalSection>
        </div>
      </ModalBody>
      <ModalFooterBar>
        <span className="mr-auto text-[11px] text-muted-foreground">Endpoint URLs are public — never put secrets in them.</span>
      </ModalFooterBar>
    </StudioModal>
  )
}

/** Preview device frames. Matches the canvas DeviceMode so the tablet button
 *  is no longer a dead end in the preview. */
export type PreviewDevice = DeviceKind

const DEVICE_BADGE: Record<PreviewDevice, string> = {
  desktop: "MacBook Pro",
  tablet: "iPad",
  mobile: "iPhone",
}

/** Wide and tall enough for a desktop frame without crowding a 1280px screen. */
const PREVIEW_DEFAULT_SIZE = { width: 1080, height: 720 }

export type PreviewOverlayProps = {
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  endpoint?: string
  customCss?: string
  device: PreviewDevice
  onDeviceChange?: (device: PreviewDevice) => void
  onClose: () => void
}

/** Remembered per-browser; a preview sized for one screen should survive a reload. */
const PREVIEW_SIZE_KEY = "ki-studio-preview-size"

export function PreviewOverlay({
  fields,
  theme,
  variant,
  endpoint,
  customCss,
  device,
  onDeviceChange,
  onClose,
}: PreviewOverlayProps) {
  const [result, setResult] = useState<string | null>(null)
  const [resizable, setResizable] = useState<ResizableState | null>(null)
  const scopedCss = customCss && validateCustomCss(customCss).ok ? scopeCustomCss(customCss) : ""

  return (
    <StudioModal
      size="lg"
      testId="preview-modal"
      onClose={onClose}
      title="Preview"
      description="The form as your users will see it, inside a device frame."
      className="sm:max-w-[min(96vw,1180px)]"
      resizable
      initialSize={PREVIEW_DEFAULT_SIZE}
      sizeStorageKey={PREVIEW_SIZE_KEY}
      onSizeStateChange={setResizable}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-2">
        {onDeviceChange && (
          // One bordered group with the active segment filled reads as a single
          // control. Three separate outline buttons read as three controls and
          // gave the toolbar a busy, dated look.
          <div
            role="group"
            aria-label="Preview device"
            className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/50 p-0.5"
          >
            {(["desktop", "tablet", "mobile"] as const).map((d) => {
              const active = device === d
              const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onDeviceChange(d)}
                  title={DEVICE_VIEWPORT_LABEL[d]}
                  className={cn(
                    "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                    active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{d[0].toUpperCase() + d.slice(1)}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Separate elements, not one joined string: each stays independently
            queryable, and the frame name and the viewport size are different
            kinds of fact. */}
        <span className="text-[11px] text-muted-foreground">{DEVICE_BADGE[device]}</span>
        <span className="text-[11px] text-muted-foreground/70">{DEVICE_VIEWPORT_LABEL[device]}</span>

        {/* Everything else is state, not control: muted, small, and out of the way. */}
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline">{variant === "conversational" ? "Conversational" : "Classic"}</span>
          {endpoint && (
            <span className="flex items-center gap-1">
              <Check className="size-3 text-studio-accent" style={{ color: "var(--studio-accent)" }} />
              endpoint
            </span>
          )}
          {scopedCss !== "" && (
            <span className="flex items-center gap-1">
              <Check className="size-3 text-studio-accent" style={{ color: "var(--studio-accent)" }} />
              custom CSS
            </span>
          )}
          {resizable?.isResized && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={resizable.reset}>
              <Maximize2 className="size-3.5" />
              Reset size
            </Button>
          )}
        </div>
      </div>

      {scopedCss !== "" && <style>{scopedCss}</style>}

      {/* The scoped-CSS wrapper doubles as the flex child. A plain block div here
          would break the `min-h-0` chain from the dialog down to DeviceFrame, and
          the frame would overflow the modal instead of being measured against it. */}
      <div data-ki-preview={PREVIEW_SCOPE_VALUE} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-muted/40">
          <DeviceFrame device={device} containerName="ki-preview">
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
          </DeviceFrame>
      </div>
    </StudioModal>
  )
}
