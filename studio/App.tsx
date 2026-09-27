import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Field, KiTheme } from "../src/types"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { FormCanvas, FieldPreview } from "./components/FormCanvas"
import { BlocksPanel } from "./components/BlocksPanel"
import { TemplatesPanel } from "./components/TemplatesPanel"
import { ConfirmApplyDialog } from "./components/StudioModal"
import { StylePanel } from "./components/StylePanel"
import { FormPanel } from "./components/FormPanel"
import { AiPanel } from "./components/AiPanel"
import { Inspector } from "./components/Inspector"
import { FormOverview } from "./components/FormOverview"
import { CodeModal, PreviewOverlay, SheetsModal } from "./components/Modals"
import { validateSchema, parseDocumentImportAll, type DocumentImport } from "./lib/schema"
import { docsHref } from "./lib/docs-url"
import { toReactSnippet } from "./lib/export"
import { buildShareUrl, decodeSharePayload, readSharePayload } from "../src/share/codec"
import { PREVIEW_SCOPE_VALUE, scopeCustomCss, validateCustomCss } from "./lib/css"
import { TEMPLATES } from "./lib/templates"
import type { ShadcnPreset } from "./lib/shadcn-presets"
import { Button } from "./components/ui/button"
import { Separator } from "./components/ui/separator"
import { Toaster } from "./components/ui/sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./components/ui/dropdown-menu"
import { BLOCK_TYPE_LABELS } from "./components/BlocksPanel"
import { toast } from "sonner"
import {
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  LayoutTemplate,
  Code2,
  Eye,
  Share2,
  Copy,
  Moon,
  Sun,
  Blocks,
  Paintbrush,
  Settings2,
  Sparkles,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronRight,
  Check,
  ChevronLeft,
  Move,
  BookOpen,
} from "lucide-react"

type Variant = "classic" | "conversational"
type Doc = { title: string; fields: Field[]; theme: KiTheme; variant: Variant; presetId?: string; endpoint?: string; customCss?: string }
type Panel = "templates" | "blocks" | "style" | "form" | "ai"
type DeviceMode = "desktop" | "tablet" | "mobile"

const STORAGE_KEY = "ki-studio-doc-v2"

const NEW_FIELD_SEEDS: Record<string, Partial<Field>> = {
  text: { type: "text", placeholder: "Short answer" },
  email: { type: "email", placeholder: "you@company.com" },
  tel: { type: "tel", placeholder: "+1 (555) 000-0000" },
  url: { type: "url", placeholder: "https://example.com" },
  number: { type: "number" },
  password: { type: "password" },
  textarea: { type: "textarea", placeholder: "Longer answer" },
  select: { type: "select", options: ["Option 1", "Option 2", "Option 3"] },
  checkbox: { type: "checkbox", label: "Check me" },
  date: { type: "date" },
}

function loadDoc(): Doc {
  const fallback = (): Doc => {
    const tpl = TEMPLATES.find((t) => t.id === "signup") ?? TEMPLATES[0]
    const r = validateSchema(tpl.fields)
    return { title: "Untitled form", fields: r.ok ? r.fields : [], theme: {}, variant: "classic" }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback()
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") return fallback()
    const p = parsed as Record<string, unknown>
    const r = validateSchema(p.fields)
    const css = typeof p.customCss === "string" && validateCustomCss(p.customCss).ok ? p.customCss : undefined
    return {
      title: typeof p.title === "string" ? p.title : "Untitled form",
      fields: r.ok ? r.fields : fallback().fields,
      theme: p.theme !== null && typeof p.theme === "object" ? (p.theme as KiTheme) : {},
      variant: p.variant === "conversational" ? "conversational" : "classic",
      presetId: typeof p.presetId === "string" ? p.presetId : undefined,
      endpoint: typeof p.endpoint === "string" && p.endpoint !== "" ? p.endpoint : undefined,
      ...(css ? { customCss: css } : {}),
    }
  } catch {
    return fallback()
  }
}

export default function App() {
  const [doc, setDoc] = useState<Doc>(loadDoc)
  const docRef = useRef(doc)
  docRef.current = doc

  const [past, setPast] = useState<Doc[]>([])
  const [future, setFuture] = useState<Doc[]>([])
  const lastPushRef = useRef(0)
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selected, setSelected] = useState<number | null>(null)
  const [panel, setPanel] = useState<Panel>("blocks")
  const [zoom, setZoom] = useState(100)
  const [drag, setDrag] = useState<
    | { kind: "palette"; fieldType: string }
    | { kind: "card"; index: number; name: string }
    | null
  >(null)
  const [panelOpen, setPanelOpen] = useState(() => {
    try {
      return localStorage.getItem("ki-studio-panel") !== "0"
    } catch {
      return true
    }
  })
  const [device, setDevice] = useState<DeviceMode>("desktop")
  const [modal, setModal] = useState<"none" | "code" | "preview" | "sheets">("none")
  /** Template awaiting confirmation when the canvas is not empty. */
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null)
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ki-studio-dark") === "1"
    } catch {
      return false
    }
  })
  const [preset, setPreset] = useState<ShadcnPreset | null>(null)
  const [presetDark, setPresetDark] = useState(false)

  // Every panel is docked at every width now, so no width queries gate the
  // layout. `useMinWidth` is kept for callers that still need a breakpoint.

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Apply the dark mode class on <html> for Tailwind + Radix portals. */
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", dark)
    try {
      localStorage.setItem("ki-studio-dark", dark ? "1" : "0")
    } catch {
      // non-fatal
    }
  }, [dark])

  /** Ensure preset accent and radius are applied to root variables */
  useEffect(() => {
    const root = document.documentElement
    if (preset) {
      const t = presetDark ? preset.dark : preset.light
      root.style.setProperty("--studio-accent", t.accentColor)
      root.style.setProperty("--studio-radius", t.radius)
    } else {
      root.style.setProperty("--studio-accent", dark ? "#f97316" : "#e05328")
      root.style.removeProperty("--studio-radius")
    }
  }, [preset, presetDark, dark])

  /** Apply a document change, pushing an undo snapshot (coalesced for typing). */
  const update = useCallback((fn: (d: Doc) => Doc, coalesce = false) => {
    const prev = docRef.current
    const next = fn(prev)
    if (next === prev) return
    const now = Date.now()
    if (!(coalesce && now - lastPushRef.current < 600)) {
      setPast((p) => [...p.slice(-49), prev])
      lastPushRef.current = now
    }
    setFuture([])
    docRef.current = next
    setDoc(next)
  }, [])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const prev = p[p.length - 1]
      setFuture((f) => [docRef.current, ...f].slice(0, 50))
      docRef.current = prev
      setDoc(prev)
      return p.slice(0, -1)
    })
    setSelected(null)
  }, [])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const next = f[0]
      setPast((p) => [...p, docRef.current])
      docRef.current = next
      setDoc(next)
      return f.slice(1)
    })
    setSelected(null)
  }, [])

  /** Autosave + transient "Saved" chip. */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
    } catch {
      // storage unavailable — studio still works in-memory
    }
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 1600)
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [doc])

  const uniqueName = useCallback((base: string, fields: Field[]) => {
    let name = base
    let n = 2
    while (fields.some((f) => f.name === name)) {
      name = `${base}_${n}`
      n++
    }
    return name
  }, [])

  const addField = useCallback(
    (fieldType: string, at?: number) => {
      update((d) => {
        const seed = NEW_FIELD_SEEDS[fieldType] || { type: "text" as const }
        const nf: Field = { name: uniqueName(`${fieldType}Field`, d.fields), ...seed }
        const fields = [...d.fields]
        fields.splice(at ?? fields.length, 0, nf)
        return { ...d, fields }
      })
      setSelected(at ?? docRef.current.fields.length - 1)
    },
    [update, uniqueName],
  )

  /** Insert a new palette field at `at` (append when at === length). */
  const insertAt = useCallback(
    (fieldType: string, at: number) => {
      addField(fieldType, at >= docRef.current.fields.length ? undefined : at)
    },
    [addField],
  )

  /** Live reorder (also the drop commit for card drags). */
  const reorder = useCallback(
    (from: number, to: number) => {
      update((d) => {
        if (from === to || from < 0 || to < 0) return d
        if (from >= d.fields.length || to >= d.fields.length) return d
        const fields = [...d.fields]
        const [moved] = fields.splice(from, 1)
        fields.splice(to, 0, moved)
        return { ...d, fields }
      })
      setSelected(to)
    },
    [update],
  )

  /** dnd-kit: palette drops insert; card drags reorder live during the drag. */
  const onDragStart = useCallback((e: DragStartEvent) => {
    const id = String(e.active.id)
    if (id.startsWith("palette-")) {
      setDrag({ kind: "palette", fieldType: id.slice("palette-".length) })
      return
    }
    setDrag({ kind: "card", index: docRef.current.fields.findIndex((f) => f.name === id), name: id })
  }, [])

  const onDragOver = useCallback(
    (e: DragOverEvent) => {
      const { active, over } = e
      if (!over) return
      const aId = String(active.id)
      const oId = String(over.id)
      if (aId.startsWith("palette-") || oId === "canvas-end") return
      const from = docRef.current.fields.findIndex((f) => f.name === aId)
      const to = docRef.current.fields.findIndex((f) => f.name === oId)
      if (from === -1 || to === -1 || from === to) return
      reorder(from, to)
    },
    [reorder],
  )

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { over } = e
      const d = drag
      setDrag(null)
      if (!over || !d) return
      const oId = String(over.id)
      if (d.kind === "palette") {
        const to =
          oId === "canvas-end"
            ? docRef.current.fields.length
            : docRef.current.fields.findIndex((f) => f.name === oId)
        insertAt(d.fieldType, to === -1 ? docRef.current.fields.length : to)
        return
      }
      if (oId === "canvas-end") {
        const from = docRef.current.fields.findIndex((f) => f.name === d.name)
        const last = docRef.current.fields.length - 1
        if (from !== -1 && from !== last) reorder(from, last)
      }
    },
    [drag, insertAt, reorder],
  )

  const onDragCancel = useCallback(() => setDrag(null), [])

  const dragField = drag?.kind === "card" ? doc.fields.find((f) => f.name === drag.name) : undefined

  const moveField = useCallback(
    (index: number, delta: -1 | 1) => {
      update((d) => {
        const to = index + delta
        if (to < 0 || to >= d.fields.length) return d
        const fields = [...d.fields]
        const [moved] = fields.splice(index, 1)
        fields.splice(to, 0, moved)
        return { ...d, fields }
      })
      setSelected(index + delta)
    },
    [update],
  )

  const deleteField = useCallback(
    (index: number) => {
      update((d) => ({ ...d, fields: d.fields.filter((_, i) => i !== index) }))
      setSelected((cur) => (cur === index ? null : cur !== null && cur > index ? cur - 1 : cur))
    },
    [update],
  )

  const duplicateField = useCallback(
    (index: number) => {
      update((d) => {
        const src = d.fields[index]
        if (!src) return d
        const copy: Field = { ...src, name: uniqueName(`${src.name}_copy`, d.fields) }
        const fields = [...d.fields]
        fields.splice(index + 1, 0, copy)
        return { ...d, fields }
      })
      setSelected(index + 1)
    },
    [update, uniqueName],
  )

  const patchField = useCallback(
    (index: number, patch: Partial<Field>) => {
      update((d) => {
        const fields = d.fields.map((f, i) => (i === index ? { ...f, ...patch } : f))
        return { ...d, fields }
      }, true)
    },
    [update],
  )

  const applyTemplate = useCallback(
    (id: string) => {
      const tpl = TEMPLATES.find((t) => t.id === id)
      if (!tpl) return
      update(() => {
        const r = validateSchema(tpl.fields)
        return { ...docRef.current, fields: r.ok ? r.fields : [] }
      })
      setSelected(null)
      setPendingTemplate(null)
      toast.success(`Loaded "${tpl.name}"`)
    },
    [update],
  )

  /**
   * Applying a template replaces every field. A panel card is one click away, so
   * a non-empty canvas asks first — matching how the Code modal already guards
   * replacement. An empty canvas applies immediately.
   */
  const requestTemplate = useCallback(
    (id: string) => {
      if (docRef.current.fields.length > 0) {
        setPendingTemplate(id)
        return
      }
      applyTemplate(id)
    },
    [applyTemplate],
  )

  const applyDocument = useCallback(
    (doc: { title?: string; fields: Field[]; theme: KiTheme; variant: Variant; endpoint?: string; customCss?: string }) => {
      // Imported themes are explicit tokens, so any active preset no longer applies.
      setPreset(null)
      update((d) => ({
        ...d,
        ...(doc.title ? { title: doc.title } : {}),
        fields: doc.fields,
        theme: doc.theme,
        variant: doc.variant,
        endpoint: doc.endpoint,
        ...(doc.customCss ? { customCss: doc.customCss } : { customCss: undefined }),
      }))
      setSelected(null)
      toast.success("Document applied successfully")
    },
    [update],
  )

  /**
   * Build a share link for the current document and copy it.
   *
   * The payload lives in the URL fragment, so the link never touches a server —
   * no account, no backend, nothing to leak.
   */
  const copyShareLink = useCallback(async () => {
    const d = docRef.current
    const result = await buildShareUrl(
      {
        version: 1,
        ...(d.title ? { name: d.title } : {}),
        fields: d.fields,
        theme: d.theme,
        variant: d.variant,
        ...(d.endpoint ? { endpoint: d.endpoint } : {}),
      },
      window.location.origin,
      window.location.pathname,
    )
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    try {
      await navigator.clipboard.writeText(result.payload)
      toast.success("Share link copied — it works without an account")
    } catch {
      toast.error("Could not copy. The link is in the address bar after pressing Share again.")
    }
  }, [])

  /**
   * A shared document waiting for confirmation, when the canvas is not empty.
   */
  const [pendingShareDoc, setPendingShareDoc] = useState<DocumentImport | null>(null)

  /**
   * Read a `#ki=v1.…` fragment on mount.
   *
   * The decoded payload is untrusted input: it goes through the canonical
   * importer before touching the document, and a non-empty canvas confirms
   * first, matching the template path. Decoding a local fragment is instant,
   * so there is no loading state and no dialog unless a clobber is possible.
   */
  useEffect(() => {
    const payload = readSharePayload(window.location.hash)
    if (!payload) return
    // Consume the hash immediately so a refresh does not re-prompt.
    window.history.replaceState(null, "", window.location.pathname + window.location.search)
    void (async () => {
      const decoded = await decodeSharePayload(payload)
      if (!decoded.ok) {
        toast.error(decoded.error)
        return
      }
      const parsed = parseDocumentImportAll(decoded.doc)
      if (!parsed.ok) {
        toast.error(`This shared form is invalid: ${parsed.errors[0]}`)
        return
      }
      if (docRef.current.fields.length > 0) {
        setPendingShareDoc(parsed.doc)
        return
      }
      applyDocument(parsed.doc)
    })()
  }, [applyDocument])

  /**
   * Copy a field's name, for pasting into a schema, a condition picker, or code.
   *
   * Offered on the canvas context menu because referring to a field by name is
   * the one thing you constantly need while building a `showIf` or an endpoint
   * payload, and reading it off a truncated card is the slowest possible way.
   */
  const copyFieldName = useCallback((index: number) => {
    const field = docRef.current.fields[index]
    if (!field?.name) return
    navigator.clipboard
      .writeText(field.name)
      .then(() => toast.success(`Copied "${field.name}"`))
      .catch(() => toast.error("Clipboard unavailable"))
  }, [])

  const copyReact = useCallback(() => {
    const d = docRef.current
    const snippet = toReactSnippet("MyForm", d.fields, { theme: d.theme, variant: d.variant, endpoint: d.endpoint })
    navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success("React code copied to clipboard"))
      .catch(() => toast.error("Clipboard unavailable"))
  }, [])

  /** Apply a shadcn preset: tokens become the doc theme so preview + exports match. */
  const applyPreset = useCallback(
    (p: ShadcnPreset | null) => {
      setPreset(p)
      if (!p) {
        update((d) => ({ ...d, theme: {} }))
        return
      }
      setPresetDark(dark)
      const t = dark ? p.dark : p.light
      update((d) => ({ ...d, theme: { ...t }, presetId: p.id }))
      toast(`Theme: shadcn ${p.name} (${dark ? "dark" : "light"})`)
    },
    [update, dark],
  )

  /** Flip the applied preset between light/dark. */
  const togglePresetMode = useCallback(() => {
    if (!preset) return
    const next = !presetDark
    setPresetDark(next)
    const t = next ? preset.dark : preset.light
    update((d) => ({ ...d, theme: { ...t }, presetId: preset.id }))
  }, [preset, presetDark, update])

  /** Toggle dark mode and keep preset tokens synchronized if a preset is active */
  const toggleDarkMode = useCallback(() => {
    const next = !dark
    setDark(next)
    if (preset) {
      setPresetDark(next)
      const t = next ? preset.dark : preset.light
      update((d) => ({ ...d, theme: { ...t }, presetId: preset.id }))
    }
  }, [dark, preset, update])

  const selectedField = selected !== null ? doc.fields[selected] : undefined
  const otherFields = useMemo(() => doc.fields.filter((_, i) => i !== selected), [doc.fields, selected])

  /** Global keyboard shortcuts (skipped while typing in inputs/textarea). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d" && selected !== null) {
        e.preventDefault()
        duplicateField(selected)
        return
      }
      if (typing) return
      if (e.key === "Escape") {
        setSelected(null)
        return
      }
      if (selected !== null && e.key === "Delete") {
        e.preventDefault()
        deleteField(selected)
        return
      }
      if (selected !== null && (e.key === "ArrowUp" || e.key === "ArrowDown") && !typing) {
        e.preventDefault()
        moveField(selected, e.key === "ArrowUp" ? -1 : 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, selected, duplicateField, deleteField, moveField])

  /** Persist the panel collapse preference so the layout survives a reload. */
  useEffect(() => {
    try {
      localStorage.setItem("ki-studio-panel", panelOpen ? "1" : "0")
    } catch {
      // non-fatal
    }
  }, [panelOpen])

  /** Canvas empty-state CTA: reveal the Templates panel. */
  const openTemplatesPanel = useCallback(() => {
    setPanel("templates")
    setPanelOpen(true)
  }, [])

  const railItems: { id: Panel; icon: React.ReactNode; label: string }[] = [
    { id: "templates", icon: <LayoutTemplate className="size-5" />, label: "Templates" },
    { id: "blocks", icon: <Blocks className="size-5" />, label: "Blocks" },
    { id: "style", icon: <Paintbrush className="size-5" />, label: "Style" },
    { id: "form", icon: <Settings2 className="size-5" />, label: "Form" },
    { id: "ai", icon: <Sparkles className="size-5" />, label: "AI" },
  ]

  const panelBody = (
    <>
      {panel === "templates" && <TemplatesPanel onPick={requestTemplate} />}
      {panel === "blocks" && <BlocksPanel onAdd={(t) => addField(t)} />}
      {panel === "style" && (
        <StylePanel
          theme={doc.theme}
          preset={preset}
          presetDark={presetDark}
          onPreset={applyPreset}
          onPresetMode={togglePresetMode}
          onTokens={(theme) => update((d) => ({ ...d, theme }), true)}
          onClearPreset={() => setPreset(null)}
          customCss={doc.customCss ?? ""}
          onCustomCss={(customCss) => update((d) => ({ ...d, customCss }), true)}
        />
      )}
      {panel === "form" && (
        <FormPanel
          formTitle={doc.title}
          onTitleChange={(title) => update((d) => ({ ...d, title }), true)}
          variant={doc.variant}
          onVariantChange={(variant) => update((d) => ({ ...d, variant }))}
          endpoint={doc.endpoint}
          onEndpointChange={(endpoint) => update((d) => ({ ...d, endpoint }), true)}
          onOpenSheets={() => setModal("sheets")}
        />
      )}
      {panel === "ai" && (
        <AiPanel fields={doc.fields} onApplyDocument={applyDocument} />
      )}
    </>
  )

  const inspectorBody =
    selectedField !== undefined && selected !== null ? (
      <Inspector
        field={selectedField}
        otherFields={otherFields}
        onChange={(patch) => patchField(selected, patch)}
        onDuplicate={() => duplicateField(selected)}
        onDelete={() => deleteField(selected)}
      />
    ) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="studio-root flex h-screen flex-col overflow-hidden font-sans antialiased bg-background text-foreground selection:bg-[--studio-accent]/20 selection:text-[--studio-accent]">
        {/* ---------- Top Navigation Bar ---------- */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-5 text-foreground">
          {/* Left section: Title and status */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-lg border border-border text-foreground hover:bg-accent transition-colors"
              title="Back"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <input
                  className="w-36 sm:w-52 truncate bg-transparent text-sm font-semibold tracking-tight text-foreground outline-none hover:bg-accent/40 focus:bg-accent/60 rounded px-1 -mx-1 py-0.5 transition-colors"
                  value={doc.title}
                  placeholder="Untitled form"
                  aria-label="Form name"
                  onChange={(e) => update((d) => ({ ...d, title: e.target.value }), true)}
                />
                <span
                  aria-live="polite"
                  className={
                    "hidden items-center gap-1 text-[11px] font-medium text-muted-foreground transition-opacity duration-300 sm:flex " +
                    (saved ? "opacity-100" : "opacity-0")
                  }
                >
                  <Check className="size-3 text-emerald-500" /> Saved
                </span>
              </div>
              <span className="truncate text-[11px] text-muted-foreground hidden sm:block">
                https://kiforms.dev/f/{doc.title.toLowerCase().replace(/[^a-z0-9]/g, "-") || "preview"}
              </span>
            </div>
          </div>

          {/* Center Cluster: Undo / Redo / Dark mode */}
          <div className="hidden lg:flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-2xs text-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Undo (Ctrl+Z)"
                  disabled={past.length === 0}
                  onClick={undo}
                  className="size-8 rounded-lg"
                >
                  <Undo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Redo (Ctrl+Shift+Z)"
                  disabled={future.length === 0}
                  onClick={redo}
                  className="size-8 rounded-lg"
                >
                  <Redo2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="mx-1 !h-4" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Toggle dark mode"
                  onClick={toggleDarkMode}
                  className="size-8 rounded-lg"
                >
                  {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
            </Tooltip>
          </div>

          {/* Right section: Action buttons (Code, Docs, Preview, Copy) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModal("code")}
              className="h-8.5 rounded-lg text-xs font-semibold gap-1.5 hidden md:inline-flex border-border bg-card text-foreground hover:bg-accent hover:text-foreground"
            >
              <Code2 className="size-3.5" /> Code
            </Button>

            {/* A real link, not a modal: the docs site is the only copy now. */}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8.5 rounded-lg text-xs font-semibold gap-1.5 hidden md:inline-flex border-border bg-card text-foreground hover:bg-accent hover:text-foreground"
            >
              <a href={docsHref()} target="_blank" rel="noreferrer">
                <BookOpen className="size-3.5" /> Docs
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModal("preview")}
              className="h-8.5 rounded-lg text-xs font-semibold gap-1.5 hidden md:inline-flex border-border bg-card text-foreground hover:bg-accent hover:text-foreground"
            >
              <Eye className="size-3.5" /> Preview
            </Button>

            <Button
              size="sm"
              onClick={copyReact}
              className="h-8.5 rounded-lg bg-studio-accent hover:bg-studio-accent-hover text-white text-xs font-semibold gap-1.5 shadow-xs hidden lg:inline-flex"
              style={{ backgroundColor: "var(--studio-accent)", color: "#ffffff" }}
            >
              <Copy className="size-3.5" /> Copy Code
            </Button>

            {/* Mobile overflow menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="More actions" className="lg:hidden">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="flex items-center gap-1 lg:hidden">
                  <Button variant="ghost" size="icon-sm" aria-label="Undo (Ctrl+Z)" disabled={past.length === 0} onClick={undo}>
                    <Undo2 />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Redo (Ctrl+Shift+Z)" disabled={future.length === 0} onClick={redo}>
                    <Redo2 />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={device === "desktop" ? "Mobile width" : "Desktop width"}
                    // Cycles through all three widths, matching the canvas switcher.
                    onClick={() => setDevice((d) => (d === "desktop" ? "tablet" : d === "tablet" ? "mobile" : "desktop"))}
                  >
                    {device === "desktop" ? <Smartphone /> : <Monitor />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Toggle dark mode" onClick={toggleDarkMode}>
                    {dark ? <Sun /> : <Moon />}
                  </Button>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setModal("code")}>
                  <Code2 className="mr-2 size-4" /> Code…
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={docsHref()} target="_blank" rel="noreferrer">
                    <BookOpen className="mr-2 size-4" /> Documentation
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setModal("preview")}>
                  <Eye className="mr-2 size-4" /> Preview…
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyReact}>
                  <Copy className="mr-2 size-4" /> Copy React code
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyShareLink}>
                  <Share2 className="mr-2 size-4" /> Copy share link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setModal("sheets")}>
                  <Settings2 className="mr-2 size-4" /> Collect responses…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ---------- Workspace Body ----------
            Both side panels are permanently docked columns. They used to become
            a modal drawer below `lg` and a floating card on the canvas, which
            meant the tools you work with kept vanishing and reappearing. The
            rail, the palette, and the inspector are now always in the layout;
            the collapse toggles are the only thing that changes their width. */}
        <div className="flex min-h-0 flex-1 overflow-x-auto">
          {/* Left Navigation Rail */}
          <nav
            className="flex w-16 shrink-0 flex-col items-center justify-between border-r border-border/80 bg-sidebar py-4 shadow-2xs"
            aria-label="Panels"
          >
            {/* Top brand monogram */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-accent/60 shadow-2xs text-foreground">
                <span className="text-base font-extrabold tracking-tighter">ki</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                {railItems.map((p) => {
                  const isActive = panel === p.id
                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={p.label}
                          aria-pressed={isActive}
                          onClick={() => {
                            setPanel(p.id)
                            if (!panelOpen) setPanelOpen(true)
                          }}
                          className={`flex size-10 items-center justify-center rounded-xl transition-all duration-150 ${
                            isActive
                              ? "bg-studio-accent text-white shadow-xs"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          }`}
                          style={
                            isActive
                              ? { backgroundColor: "var(--studio-accent)", color: "#ffffff" }
                              : undefined
                          }
                        >
                          {p.icon}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">{p.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {/* Bottom expand/collapse toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setPanelOpen((o) => !o)}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label={panelOpen ? "Collapse panel" : "Expand panel"}
                >
                  {panelOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{panelOpen ? "Collapse sidebar" : "Expand sidebar"}</TooltipContent>
            </Tooltip>
          </nav>

          {/* Left palette column — always docked, never a drawer. */}
          <aside
            className={
              "studio-scrollbar flex shrink-0 flex-col border-r border-border/80 bg-sidebar transition-all duration-200 " +
              (panelOpen ? "w-80" : "w-0 overflow-hidden border-none")
            }
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 px-4">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {railItems.find((r) => r.id === panel)?.label}
              </span>
              <div className="flex items-center gap-1">
                {panel === "style" && preset && (
                  <span className="rounded bg-[--studio-accent-subtle] px-2 py-0.5 text-[10px] font-semibold text-[--studio-accent]">
                    {preset.name}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Collapse panel"
                  onClick={() => setPanelOpen(false)}
                >
                  <PanelLeftClose className="size-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 studio-scrollbar">{panelBody}</div>
          </aside>

          {/* Main Canvas Work Area */}
          <main className="studio-canvas relative flex min-w-80 flex-1 flex-col overflow-hidden" onClick={() => setSelected(null)}>
            {/* Canvas Sub-Header Bar (Controls) */}
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/80 bg-card/60 px-4 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                {/* Doubles as the panel toggle on narrow screens now that there
                    is no drawer to open. */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7.5 px-2.5 text-xs gap-1.5"
                  aria-label={panelOpen ? "Collapse panel" : "Open panels"}
                  aria-pressed={panelOpen}
                  onClick={() => setPanelOpen((o) => !o)}
                >
                  <Blocks className="size-3.5" /> Panels
                </Button>
              </div>

              {/* Center & Right: Zoom & Device mode */}
              <div className="flex items-center gap-3 ml-auto">
                {/* Zoom controls */}
                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2 py-0.5 shadow-2xs text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoom((z) => Math.max(z - 10, 50))
                    }}
                    className="px-1 text-muted-foreground hover:text-foreground"
                  >
                    -
                  </button>
                  <span className="font-semibold text-foreground px-1">{zoom}%</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setZoom((z) => Math.min(z + 10, 150))
                    }}
                    className="px-1 text-muted-foreground hover:text-foreground"
                  >
                    +
                  </button>
                </div>

                {/* Device viewport switcher */}
                <div className="flex items-center rounded-lg border border-border/80 bg-card p-0.5 shadow-2xs">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Desktop width"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDevice("desktop")
                        }}
                        className={`size-7 rounded-md flex items-center justify-center transition-colors ${
                          device === "desktop"
                            ? "bg-accent text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Monitor className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Desktop width</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Tablet width"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDevice("tablet")
                        }}
                        className={`size-7 rounded-md flex items-center justify-center transition-colors ${
                          device === "tablet"
                            ? "bg-accent text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Tablet className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Tablet width</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Mobile width"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDevice("mobile")
                        }}
                        className={`size-7 rounded-md flex items-center justify-center transition-colors ${
                          device === "mobile"
                            ? "bg-accent text-foreground shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Smartphone className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Mobile width</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Scrollable Canvas Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start studio-scrollbar">
              <div
                data-ki-preview={PREVIEW_SCOPE_VALUE}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
                className={
                  "studio-paper w-full rounded-2xl sm:rounded-3xl border border-border bg-card text-foreground transition-all duration-200 " +
                  (device === "mobile"
                    ? "max-w-[390px]"
                    : device === "tablet"
                    ? "max-w-[640px]"
                    : "max-w-2xl")
                }
              >
                {doc.customCss && validateCustomCss(doc.customCss).ok && (
                  <style>{scopeCustomCss(doc.customCss)}</style>
                )}
                <FormCanvas
                  fields={doc.fields}
                  theme={doc.theme}
                  selected={selected}
                  onSelect={setSelected}
                  onMove={moveField}
                  onDuplicate={duplicateField}
                  onDelete={deleteField}
                  onCopyName={copyFieldName}
                  onPatch={patchField}
                  onOpenTemplates={openTemplatesPanel}
                />
              </div>
            </div>

            {/* Floating Inspector Panel for smaller screens */}
          </main>

          {/* Right column. Permanently docked at every width — it never
              disappears, it just changes what it is showing. With a field
              selected it is that field's settings; with nothing selected it is a
              summary of the whole document, because a docked panel that blanks
              out is worse than no panel at all. */}
          <aside
            data-testid="inspector-panel"
            className="studio-scrollbar flex w-84 shrink-0 flex-col border-l border-border/80 bg-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/80 px-4">
              {/* Breadcrumb, not just a title: in a panel this narrow, knowing
                  *which* field you are editing is the whole point of the header. */}
              <nav aria-label="Editing context" className="flex min-w-0 items-center gap-1.5 text-xs">
                <span className="truncate text-muted-foreground">{doc.title || "Untitled form"}</span>
                {selectedField && (
                  <>
                    <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate font-mono font-medium text-foreground">{selectedField.name}</span>
                  </>
                )}
              </nav>
              {selectedField && (
                <Button variant="ghost" size="icon-sm" aria-label="Close field settings" onClick={() => setSelected(null)}>
                  <X className="size-4 text-muted-foreground" />
                </Button>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 studio-scrollbar">
              {selectedField && inspectorBody ? (
                inspectorBody
              ) : (
                <FormOverview
                  title={doc.title}
                  fields={doc.fields}
                  variant={doc.variant}
                  endpoint={doc.endpoint}
                  hasCustomCss={typeof doc.customCss === "string" && doc.customCss.trim() !== ""}
                />
              )}
            </div>
          </aside>
        </div>

        {/* Modals & Overlays */}
        <ConfirmApplyDialog
          open={pendingTemplate !== null}
          title="Replace current form?"
          description={
            pendingTemplate
              ? `Loading "${TEMPLATES.find((t) => t.id === pendingTemplate)?.name ?? pendingTemplate}" replaces every field on the canvas. Undo (Ctrl+Z) restores them.`
              : undefined
          }
          confirmLabel="Replace"
          onConfirm={() => {
            if (pendingTemplate) applyTemplate(pendingTemplate)
          }}
          onCancel={() => setPendingTemplate(null)}
        />
        <ConfirmApplyDialog
          open={pendingShareDoc !== null}
          title="Open the shared form?"
          description="This replaces every field on the canvas with the shared document. Undo (Ctrl+Z) restores them."
          confirmLabel="Open"
          onConfirm={() => {
            if (pendingShareDoc) applyDocument(pendingShareDoc)
            setPendingShareDoc(null)
          }}
          onCancel={() => setPendingShareDoc(null)}
        />
        {modal === "code" && (
          <CodeModal
            fields={doc.fields}
            theme={doc.theme}
            variant={doc.variant}
            endpoint={doc.endpoint}
            customCss={doc.customCss}
            onApplyDocument={applyDocument}
            onClose={() => setModal("none")}
          />
        )}
        {modal === "sheets" && (
          <SheetsModal
            onConnect={(url) => {
              update((d) => ({ ...d, endpoint: url }))
              setModal("none")
              setPanel("form")
              toast.success("Google Sheets connected — Preview to test a submission")
            }}
            onClose={() => setModal("none")}
          />
        )}
        {modal === "preview" && (
          <PreviewOverlay
            fields={doc.fields}
            theme={doc.theme}
            variant={doc.variant}
            endpoint={doc.endpoint}
            customCss={doc.customCss}
            // All three canvas widths, so the tablet button is no longer a dead end.
            device={device}
            onDeviceChange={setDevice}
            onClose={() => setModal("none")}
          />
        )}

        {/* Live Drag Overlays matching the reference image */}
        <DragOverlay>
          {drag?.kind === "card" && dragField ? (
            <div className="w-96 rotate-2 rounded-xl border-2 border-dashed border-[--studio-accent] bg-card p-4 shadow-2xl">
              <FieldPreview field={dragField} />
            </div>
          ) : drag?.kind === "palette" ? (
            <div className="flex items-center gap-2.5 rounded-xl border-2 border-dashed border-[--studio-accent] bg-card px-4 py-3 text-xs font-semibold text-[--studio-accent] shadow-2xl rotate-2">
              <Move className="size-3.5" />
              <span>{BLOCK_TYPE_LABELS[drag.fieldType] ?? drag.fieldType}</span>
            </div>
          ) : null}
        </DragOverlay>

        <Toaster position="bottom-right" richColors />
      </div>
    </DndContext>
  )
}
