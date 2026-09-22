import { useState } from "react"
import type { Field, KiTheme } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import { toJson, toRoundTripSnippet, importSchemaBlock, exportReact } from "../lib/export"
import { parseDocumentImport, parseDocumentImportAll, type DocumentImport } from "../lib/schema"
import { PREVIEW_SCOPE_VALUE, scopeCustomCss, validateCustomCss } from "../lib/css"
import { TEMPLATES } from "../lib/templates"
import { appsScript, diagnoseNoCors } from "../lib/sheets"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"
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
  useStudioEscape,
  useFocusRestore,
} from "./StudioModal"
import { Check, FileJson, FileCode2, BookOpen, ExternalLink } from "lucide-react"

export { StudioCopyButton as CopyButton }
export { useStudioEscape as useEscape }

export type TemplatesModalProps = {
  onPick: (id: string) => void
  onClose: () => void
}

export function TemplatesModal({ onPick, onClose }: TemplatesModalProps) {
  return (
    <StudioModal size="md" testId="templates-modal" onClose={onClose} title="Start from a template" description="Pick a schema — everything stays editable on the canvas.">
      <ModalBody>
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
      </ModalBody>
    </StudioModal>
  )
}

export type DocsModalProps = { onClose: () => void }

type DocsSection = {
  id: string
  label: string
  body: string
  bullets?: string[]
  code?: string
  codeLabel?: string
  tip?: string
  tryIt?: string
}

const DOCS_SECTIONS: DocsSection[] = [
  {
    id: "quick-start",
    label: "Getting started",
    body: "Choose a template, edit fields on the canvas, customize the Style and Form panels, preview device widths, then use Code to export. Your work autosaves to this browser.",
    bullets: [
      "Blocks panel: click or drag a block to append it to the canvas.",
      "Click a canvas card to open Field settings (rename, required, conditions).",
      "Style panel: theme tokens + shadcn presets — preview and exports stay in sync.",
      "Form panel: title, classic / conversational variant, endpoint URL.",
      "Code button: copy Schema JSON or a ready-to-paste React component.",
    ],
    tryIt: "Try it: open Templates, load Signup, then press Code → Schema JSON.",
  },
  {
    id: "canvas",
    label: "Canvas & editing",
    body: "The canvas renders the real KiForm runtime, so what you see is what your users get — including smart labels, placeholders, and conditional visibility.",
    bullets: [
      "Drag cards to reorder (touch supported); ArrowUp / ArrowDown moves the selected field.",
      "Duplicate (Ctrl+D) and Delete keys work when a field is selected; Escape deselects.",
      "Undo / Redo covers the last 50 document states; typing is coalesced.",
      "Empty canvas offers Start from a template — nothing is lost silently.",
    ],
    tip: "Autosave key: ki-studio-doc-v2 in localStorage. Corrupt saves fall back to the Signup template.",
  },
  {
    id: "fields",
    label: "Field reference",
    body: "Available blocks: text, email, password, number, tel, url, date, textarea, select, and checkbox. Every field name becomes a submitted value key and must be unique.",
    bullets: [
      "String shorthand (\"email\") means a field named email with default text semantics.",
      "Smart defaults: email / password types inferred, labels generated (firstName → First Name), placeholders added.",
      "Number fields submit \"\" (not 0) when empty; checkbox submits boolean.",
      "Select needs a non-empty options array of strings or { label, value }.",
      "defaultValue must be a JSON-serializable primitive (string, number, boolean).",
    ],
    code: `{ name: "email", type: "email", required: true, label: "Email" }\n{ name: "role", options: ["User", "Admin"] }\n{ name: "age", type: "number" }`,
    codeLabel: "Field examples",
  },
  {
    id: "conditions",
    label: "Conditions",
    body: "Use showIf with field plus equals or notEquals. It is the single source of truth: a field with required: true is required exactly when it is visible — no second condition to synchronize. Hidden fields skip validation, including external Zod schemas.",
    bullets: [
      "Single: { field, equals } or { field, notEquals } — exactly one of equals / notEquals.",
      "Groups: all (every condition matches, AND) or any (one match is enough, OR).",
      "A top-level condition combines with groups via AND.",
      "Legacy requiredWhen is deprecated compat only — new schemas use showIf + required.",
    ],
    code: `showIf: { field: "plan", equals: "Pro" }\n\nshowIf: { all: [\n  { field: "country", equals: "US" },\n  { field: "plan", equals: "Pro" }\n] }`,
    codeLabel: "Condition examples",
    tip: "Test conditions in Preview: pick Admin → the dependent field appears and becomes required.",
  },
  {
    id: "validation",
    label: "Validation",
    body: "Required validation is derived from showIf + required. Optional length / pattern / range constraints refine non-empty values. External schemas (e.g. Zod via buildZodSchema) are also skipped for hidden fields at runtime.",
    bullets: [
      "Visible + required + empty → error; hidden → no error, even if required.",
      "minLength / maxLength / pattern apply to non-empty text-like values; min / max apply to number fields.",
      "Constraints never fire on empty values — required owns emptiness, so optional fields stay skippable.",
      "Field names must be non-empty and unique; types, options, and constraint shapes are validated on import.",
      "onChange callbacks are application code — they cannot be stored in portable JSON and are reported as export warnings.",
      "Code modal validates before applying and lists every issue with field paths.",
    ],
    code: `{ name: "company", showIf: { field: "role", equals: "Admin" }, required: true }\n{ name: "password", type: "password", minLength: 8 }\n{ name: "age", type: "number", min: 18, max: 120 }`,
    codeLabel: "Required + constraints",
  },
  {
    id: "themes",
    label: "Themes",
    body: "Theme tokens become --ki-* CSS variables on the form element. Defaults match the built-in styles, so no theme means zero visual change.",
    bullets: [
      "Tokens: accentColor, borderColor, errorColor, helperColor, radius, surfaceColor, textColor, fontFamily.",
      "Applying a shadcn preset writes its tokens into the document theme — exports match the preview.",
      "Toggling Studio dark mode with a preset active flips the preset light/dark tokens too.",
      "React exports include the theme prop plus import \"ki-forms/styles.css\".",
    ],
    code: `theme={{\n  accentColor: "#ea580c",\n  radius: "0.625rem",\n  fontFamily: "system-ui, sans-serif",\n}}`,
    codeLabel: "Theme prop",
  },
  {
    id: "styling",
    label: "Styling & CSS",
    body: "Use field className for field-specific CSS in your application. Theme tokens handle common styling; document-level custom CSS previews scoped and exports separately — never injected by the core runtime.",
    bullets: [
      "className styles the field input, not the whole row (layout hooks are a planned wrapperClassName).",
      "Write custom CSS in the Style panel — the canvas and Preview render it scoped under [data-ki-preview=\"studio\"], so Studio chrome is untouched.",
      "Export via Code → CSS (copy or Download .css) and paste it into your app stylesheet under your own container.",
      "Imports carry custom CSS with the document; oversize (>20k chars) or </style> breakouts are rejected, never applied.",
    ],
    code: `{ name: "rating", className: "feedback-rating" }\n\n.feedback-rating { border-color: #ea580c; }`,
    codeLabel: "className example",
  },
  {
    id: "responses",
    label: "Responses",
    body: "Add an endpoint in the Form panel to POST { values, meta } as JSON on every valid submit. Works with Formspree, Web3Forms, Basin, automation webhooks, or Google Sheets via Apps Script.",
    bullets: [
      "Method POST (default) or PUT, custom headers, re-labelable status line or hideSubmitStatus.",
      "onSubmit still fires; onSubmitted(result) reports the request outcome.",
      "Google Sheets flow: paste the generated Apps Script once, deploy as Anyone, connect the /exec URL.",
      "Security boundary: the endpoint URL is public (browser POST) — never put secrets in it.",
    ],
    code: `<KiForm fields={fields} endpoint="https://script.google.com/macros/s/…/exec" />`,
    codeLabel: "Endpoint usage",
    tip: "Apps Script can't answer CORS preflights — ki-forms sends those endpoints as text/plain automatically.",
  },
  {
    id: "ai",
    label: "AI generation",
    body: "Open the AI panel in the left rail, describe the form, and review the proposed schema before anything touches the canvas. AI proposes — you dispose.",
    bullets: [
      "Bring your own key: any OpenAI-compatible /chat/completions endpoint + model name.",
      "The key lives in sessionStorage only — never the document, localStorage, or share links; requests go straight from your browser to the provider.",
      "Output is validated with the canonical importer — failures show path-specific errors and nothing is applied.",
      "Applying over a non-empty canvas asks for confirmation (undoable with Ctrl+Z).",
      "The formal ki-forms/schema.json backs the prompt contract for reliable output.",
    ],
    tryIt: "Try it: AI panel → Waitlist example → Generate schema → Apply to canvas.",
  },
  {
    id: "import-export",
    label: "Import & export",
    body: "Schema JSON is portable and editable; the React component is ready to paste into any React 18+ app. Round-trip markers let exported code be pasted back into Studio.",
    bullets: [
      "Import accepts a field array or a full document (fields + theme, variant, endpoint).",
      "Add \"$schema\": \"ki-forms/schema.json\" at the document top level for editor autocomplete and LLM output validation — imports ignore the key.",
      "Export options: TypeScript / JavaScript, Zod schema, theme, endpoint, hidden schema marker.",
      "Applying JSON over a non-empty canvas asks for confirmation first.",
      "Copy importable adds /* ki-forms:schema:start */ … /* ki-forms:schema:end */ for Import code.",
    ],
    tryIt: "Try it: Code → React → copy importable → Import code → paste → Import from code.",
  },
  {
    id: "shortcuts",
    label: "Keyboard shortcuts",
    body: "Studio shortcuts (skipped while typing in inputs, textareas, selects, or contentEditable).",
    bullets: [
      "Ctrl/⌘+Z — Undo; Ctrl/⌘+Shift+Z — Redo.",
      "Ctrl/⌘+D — Duplicate selected field.",
      "Delete — Delete selected field; Escape — deselect / close panel / close modal.",
      "ArrowUp / ArrowDown — Move selected field up / down.",
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    body: "Labels are associated with inputs (IDs + ARIA error wiring); the submit button is theme-aware. Conversational mode announces steps and jumps back to failing fields.",
    bullets: [
      "Modals restore focus to the opener and close on Escape.",
      "Validation summaries use role=alert; copy buttons use aria-live feedback.",
      "Enter in a textarea inserts a newline instead of advancing (conversational).",
      "Planned: axe coverage, aria-live submit status, full keyboard-only Studio audit.",
    ],
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    body: "Common fixes without losing work.",
    bullets: [
      "Import rejected? Read the field path (e.g. fields[2].showIf) — fix that field and re-apply; the canvas is untouched until success.",
      "No schema block found? Re-copy with copy importable — plain React has no hidden marker.",
      "Sheets URL rejected? It must match https://script.google.com/macros/s/…/exec.",
      "Blank canvas after reload? Check localStorage ki-studio-doc-v2 — corrupt saves fall back to Signup; re-import your last exported JSON.",
      "Endpoint failing with CORS? Keep Apps Script defaults (no no-cors) and let ki-forms send text/plain.",
    ],
  },
]

export function DocsModal({ onClose }: DocsModalProps) {
  const [section, setSection] = useState("quick-start")
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const filtered = q
    ? DOCS_SECTIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.body.toLowerCase().includes(q) ||
          (s.bullets ?? []).some((b) => b.toLowerCase().includes(q)),
      )
    : DOCS_SECTIONS
  const index = DOCS_SECTIONS.findIndex((s) => s.id === section)
  const current = DOCS_SECTIONS[index] ?? DOCS_SECTIONS[0]
  const prev = DOCS_SECTIONS[(index - 1 + DOCS_SECTIONS.length) % DOCS_SECTIONS.length]
  const next = DOCS_SECTIONS[(index + 1) % DOCS_SECTIONS.length]

  return (
    <StudioModal
      size="lg"
      testId="docs-modal"
      onClose={onClose}
      title={<span className="flex items-center gap-2"><BookOpen className="size-4 text-studio-accent" /> Schema Studio guide</span>}
      description="Learn the schema, preview, and export workflow without leaving Studio."
    >
        <div className="flex shrink-0 items-center gap-2 border-b p-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs… (e.g. showIf, endpoint, shortcuts)"
            aria-label="Search documentation"
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-xs outline-none focus-visible:border-studio-accent focus-visible:ring-studio-accent/30 focus-visible:ring-[3px]"
          />
          {q && (
            <span className="shrink-0 text-[11px] text-muted-foreground" aria-live="polite">
              {filtered.length} of {DOCS_SECTIONS.length}
            </span>
          )}
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row">
          <nav aria-label="Documentation sections" className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r sm:p-3">
            {filtered.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No sections match “{query.trim()}”.</p>
            )}
            {filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-current={s.id === section ? "true" : undefined}
                className={cn("shrink-0 rounded-md px-2.5 py-1.5 text-left text-xs font-medium hover:bg-accent", s.id === section && "bg-accent text-foreground")}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>
          <article aria-live="polite" className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 text-sm leading-relaxed sm:p-6">
            <h2 className="mb-2 text-lg font-semibold">{current.label}</h2>
            <p className="text-muted-foreground">{current.body}</p>
            {current.bullets && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px]">
                {current.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {current.code && (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{current.codeLabel ?? "Example"}</span>
                  <StudioCopyButton getText={() => current.code ?? ""} label="copy example" />
                </div>
                <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-xs">{current.code}</pre>
              </div>
            )}
            {current.tip && (
              <p className="mt-3 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">💡 {current.tip}</p>
            )}
            {current.tryIt && (
              <p className="mt-3 text-xs font-medium text-studio-accent">▶ {current.tryIt}</p>
            )}
            <div className="mt-6 flex items-center justify-between gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setSection(prev.id)} aria-label={`Previous: ${prev.label}`}>
                ← {prev.label}
              </Button>
              <a className="inline-flex items-center gap-1.5 text-xs font-medium text-studio-accent hover:underline" href="https://github.com/kadirulislam/ki-forms#readme" target="_blank" rel="noreferrer">Full documentation <ExternalLink className="size-3" /></a>
              <Button variant="outline" size="sm" onClick={() => setSection(next.id)} aria-label={`Next: ${next.label}`}>
                {next.label} →
              </Button>
            </div>
            </article>
        </div>
    </StudioModal>
  )
}

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
      <div className="flex shrink-0 items-center justify-between gap-2 border-b p-2">
        <div className="flex items-center gap-2">
          <ReadOnlyBadge label={tab === "json" || tab === "code" ? "editable" : "read-only"} />
          {tab === "react" && warnings.length > 0 && (
            <span className="text-[11px] text-amber-600">{warnings.length} export note{warnings.length > 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tab === "json" && (
            <>
              <Button variant="outline" size="sm" onClick={resetJson}>
                Reset
              </Button>
              <Button variant="outline" size="sm" onClick={() => download("form.schema.json", text, "application/json")}>
                Download .json
              </Button>
              <Button size="sm" onClick={requestApplyJson}>
                Apply changes
              </Button>
            </>
          )}
          {tab === "react" && (
            <Button variant="outline" size="sm" onClick={() => download("MyForm.tsx", shownReact, "text/plain")}>
              Download .tsx
            </Button>
          )}
          {tab === "code" && (
            <>
              <Button variant="outline" size="sm" onClick={pasteFromClipboard}>
                Paste from clipboard
              </Button>
              <Button size="sm" onClick={requestApplyCode}>
                Import from code
              </Button>
            </>
          )}
          {tab === "css" && customCss !== "" && (
            <Button variant="outline" size="sm" onClick={() => download("form.css", customCss, "text/css")}>
              Download .css
            </Button>
          )}
          {(tab === "json" || tab === "react" || tab === "css") && (
            <StudioCopyButton getText={() => (tab === "json" ? text : tab === "react" ? shownReact : customCss)} />
          )}
        </div>
      </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 min-w-0 flex-1 flex-col gap-0">
          <div className="border-b p-2">
            <TabsList aria-label="Code and schema sections">
              <TabsTrigger value="json">
                <FileJson /> Schema JSON
              </TabsTrigger>
              <TabsTrigger value="react">
                <FileCode2 /> React component
              </TabsTrigger>
              <TabsTrigger value="code">
                <FileCode2 /> Import code
              </TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="json" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-4">
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

          <TabsContent value="react" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-4">
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

          <TabsContent value="code" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-4">
            <ModalSection title="Import · from exported code">
            <CodeEditor
              label="Import from code editor"
              value={codeText}
              placeholder="Paste a component copied with “copy importable”…"
              onChange={(v) => { setCodeText(v); setCodeError(null); setCodeApplied(null) }}
            />
            {liveCode?.ok ? importPreview(liveCode.doc) : liveCode ? <ValidationSummary issues={liveCode.errors.map((message) => ({ message }))} /> : null}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={requestApplyCode}>
                Import from code
              </Button>
              {codeApplied && <span className="text-xs text-emerald-600">✓ {codeApplied}</span>}
            </div>
            <ValidationSummary error={codeError} />
            </ModalSection>
          </TabsContent>

          <TabsContent value="css" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-4">
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

          <TabsContent value="settings" className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4">
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

export type PreviewOverlayProps = {
  fields: Field[]
  theme: KiTheme
  variant: "classic" | "conversational"
  endpoint?: string
  customCss?: string
  device: "desktop" | "mobile"
  onClose: () => void
}

export function PreviewOverlay({ fields, theme, variant, endpoint, customCss, device, onClose }: PreviewOverlayProps) {
  const [result, setResult] = useState<string | null>(null)
  useStudioEscape(onClose)
  useFocusRestore()
  const scopedCss = customCss && validateCustomCss(customCss).ok ? scopeCustomCss(customCss) : ""

  return (
    <div role="dialog" aria-modal="true" aria-label="Form preview" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={onClose}>
      <div
        data-ki-preview={PREVIEW_SCOPE_VALUE}
        className={cn(
          "flex max-h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-2xl",
          device === "mobile" ? "max-w-[420px]" : "max-w-2xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {scopedCss !== "" && <style>{scopedCss}</style>}
        <div className="flex h-11 shrink-0 items-center gap-2 overflow-x-auto border-b px-3">
          <Badge variant="secondary">{device === "mobile" ? "Mobile · 390px" : "Desktop"}</Badge>
          <Badge variant="secondary">{variant === "conversational" ? "Conversational" : "Classic"}</Badge>
          {endpoint && <Badge variant="secondary">endpoint ✓</Badge>}
          {scopedCss !== "" && <Badge variant="secondary">custom CSS ✓</Badge>}
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
