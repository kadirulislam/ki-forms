import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Field, KiTheme } from "../src/types"
import { PaperForm } from "./components/PaperForm"
import { BlocksPanel } from "./components/BlocksPanel"
import { StylePanel } from "./components/StylePanel"
import { FormPanel } from "./components/FormPanel"
import { Inspector } from "./components/Inspector"
import { TemplatesModal, CodeModal, PreviewOverlay } from "./components/Modals"
import { validateSchema } from "./lib/schema"
import { toReactSnippet } from "./lib/export"
import { TEMPLATES } from "./lib/templates"
import type { ShadcnPreset } from "./lib/shadcn-presets"
import { Button } from "./components/ui/button"
import { Separator } from "./components/ui/separator"
import { Toaster } from "./components/ui/sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip"
import { toast } from "sonner"
import {
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Zap,
  Code2,
  Eye,
  Copy,
  Moon,
  Sun,
  Blocks,
  Paintbrush,
  Settings2,
} from "lucide-react"

type Variant = "classic" | "conversational"
type Doc = { title: string; fields: Field[]; theme: KiTheme; variant: Variant; presetId?: string }
type Panel = "blocks" | "style" | "form"

const STORAGE_KEY = "ki-studio-doc-v2"

const NEW_FIELD_SEEDS: Record<string, Partial<Field>> = {
  text: { type: "text", placeholder: "Short answer" },
  email: { type: "email", placeholder: "you@company.com" },
  password: { type: "password" },
  number: { type: "number" },
  textarea: { type: "textarea", placeholder: "Longer answer" },
  select: { type: "select", options: ["Option 1", "Option 2", "Option 3"] },
  checkbox: { type: "checkbox", label: "Check me" },
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
    return {
      title: typeof p.title === "string" ? p.title : "Untitled form",
      fields: r.ok ? r.fields : fallback().fields,
      theme: p.theme !== null && typeof p.theme === "object" ? (p.theme as KiTheme) : {},
      variant: p.variant === "conversational" ? "conversational" : "classic",
      presetId: typeof p.presetId === "string" ? p.presetId : undefined,
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

  const [selected, setSelected] = useState<number | null>(null)
  const [panel, setPanel] = useState<Panel>("blocks")
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop")
  const [modal, setModal] = useState<"none" | "templates" | "code" | "preview">("none")
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ki-studio-dark") === "1"
    } catch {
      return false
    }
  })
  const [preset, setPreset] = useState<ShadcnPreset | null>(null)
  const [presetDark, setPresetDark] = useState(false)

  /** Apply the studio accent + preset preview mode on <html> for Tailwind + Radix portals. */
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", dark)
    try {
      localStorage.setItem("ki-studio-dark", dark ? "1" : "0")
    } catch {
      // non-fatal
    }
  }, [dark])

  useEffect(() => {
    const root = document.documentElement
    if (preset) {
      const t = presetDark ? preset.dark : preset.light
      root.style.setProperty("--studio-accent", t.accentColor)
      root.style.setProperty("--studio-radius", t.radius)
    } else {
      root.style.removeProperty("--studio-accent")
      root.style.removeProperty("--studio-radius")
    }
  }, [preset, presetDark])

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

  /** Autosave every committed change. */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
    } catch {
      // storage unavailable — studio still works in-memory
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

  const handleDrop = useCallback(
    (payload: { kind: "palette"; fieldType: string } | { kind: "move"; index: number }, at: number) => {
      update((d) => {
        if (payload.kind === "palette") return d // handled by addField below
        const from = payload.index
        if (from === at || from + 1 === at) return d
        const moved = d.fields[from]
        const without = d.fields.filter((_, i) => i !== from)
        const target = at > from ? at - 1 : at
        const fields = [...without]
        fields.splice(target, 0, moved)
        return { ...d, fields }
      })
      if (payload.kind === "palette") addField(payload.fieldType, at)
    },
    [update, addField],
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
      setModal("none")
      toast(`Loaded "${tpl.name}"`)
    },
    [update],
  )

  const applyJson = useCallback(
    (fields: Field[]) => {
      update((d) => ({ ...d, fields }))
      setSelected(null)
      toast("Schema applied")
    },
    [update],
  )

  const copyReact = useCallback(() => {
    const d = docRef.current
    const snippet = toReactSnippet("MyForm", d.fields, { theme: d.theme, variant: d.variant })
    navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success("React code copied — paste it into your app"))
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

  const selectedField = selected !== null ? doc.fields[selected] : undefined
  const otherFields = useMemo(() => doc.fields.filter((_, i) => i !== selected), [doc.fields, selected])

  const onKeydown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    },
    [undo, redo],
  )

  const railItems: { id: Panel; icon: React.ReactNode; label: string }[] = [
    { id: "blocks", icon: <Blocks />, label: "Blocks" },
    { id: "style", icon: <Paintbrush />, label: "Style" },
    { id: "form", icon: <Settings2 />, label: "Form" },
  ]

  return (
    <div className="studio-root flex h-screen flex-col overflow-hidden font-sans antialiased" onKeyDown={onKeydown}>
      {/* ---------- top bar ---------- */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-[--studio-accent] text-sm font-bold text-white">
            ki
          </span>
          <input
            className="w-44 min-w-0 truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium outline-none hover:bg-accent focus:bg-accent"
            value={doc.title}
            placeholder="Untitled form"
            aria-label="Form name"
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }), true)}
          />
        </div>

        <div className="mx-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Undo (Ctrl+Z)" disabled={past.length === 0} onClick={undo}>
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Redo (Ctrl+Shift+Z)" disabled={future.length === 0} onClick={redo}>
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="mx-1 !h-5" />
          <div className="flex items-center rounded-md border p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={device === "desktop" ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label="Desktop width"
                  onClick={() => setDevice("desktop")}
                >
                  <Monitor />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desktop width</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={device === "mobile" ? "secondary" : "ghost"}
                  size="icon-sm"
                  aria-label="Mobile width"
                  onClick={() => setDevice("mobile")}
                >
                  <Smartphone />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mobile width</TooltipContent>
            </Tooltip>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Toggle dark mode"
                onClick={() => setDark((v) => !v)}
              >
                {dark ? <Sun /> : <Moon />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{dark ? "Light mode" : "Dark mode"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setModal("templates")}>
            <Zap /> Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal("code")}>
            <Code2 /> Code
          </Button>
          <Button variant="outline" size="sm" onClick={() => setModal("preview")}>
            <Eye /> Preview
          </Button>
          <Button size="sm" onClick={copyReact}>
            <Copy /> Copy React code
          </Button>
        </div>
      </header>

      {/* ---------- body ---------- */}
      <div className="flex min-h-0 flex-1">
        {/* icon rail */}
        <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r bg-sidebar py-3" aria-label="Panels">
          {railItems.map((p) => (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={panel === p.id ? "secondary" : "ghost"}
                  size="icon"
                  className="size-10 rounded-lg"
                  aria-label={p.label}
                  aria-pressed={panel === p.id}
                  onClick={() => setPanel(p.id)}
                >
                  {p.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{p.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* side panel */}
        <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar">
          <div className="flex h-10 items-center border-b px-3">
            <span className="text-sm font-medium">{railItems.find((r) => r.id === panel)?.label}</span>
            {panel === "style" && preset && (
              <span className="ml-auto text-xs text-muted-foreground">shadcn {preset.name}</span>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
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
              />
            )}
            {panel === "form" && (
              <FormPanel
                formTitle={doc.title}
                onTitleChange={(title) => update((d) => ({ ...d, title }), true)}
                variant={doc.variant}
                onVariantChange={(variant) => update((d) => ({ ...d, variant }))}
              />
            )}
          </div>
        </aside>

        {/* canvas */}
        <main
          className={
            "relative min-w-0 flex-1 overflow-auto bg-accent/40 p-6 " +
            (device === "mobile" ? "flex justify-center" : "")
          }
          onClick={() => setSelected(null)}
        >
          <div
            className={
              "mx-auto w-full rounded-xl border bg-card shadow-sm transition-[max-width] " +
              (device === "mobile" ? "max-w-[390px]" : "max-w-2xl")
            }
          >
            <PaperForm
              fields={doc.fields}
              theme={doc.theme}
              variant={doc.variant}
              selected={selected}
              onSelect={setSelected}
              onDelete={deleteField}
              onDuplicate={duplicateField}
              onDrop={handleDrop}
            />
          </div>

          {selectedField && (
            <div
              className="absolute right-4 top-4 bottom-4 z-10 w-72 overflow-y-auto rounded-lg border bg-popover shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex h-10 items-center justify-between border-b bg-popover px-3">
                <span className="text-sm font-medium">Field settings</span>
                <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setSelected(null)}>
                  ✕
                </Button>
              </div>
              <Inspector
                field={selectedField}
                otherFields={otherFields}
                onChange={(patch) => selected !== null && patchField(selected, patch)}
              />
            </div>
          )}
        </main>
      </div>

      {modal === "templates" && <TemplatesModal onPick={applyTemplate} onClose={() => setModal("none")} />}
      {modal === "code" && (
        <CodeModal
          fields={doc.fields}
          theme={doc.theme}
          variant={doc.variant}
          onApplyJson={applyJson}
          onClose={() => setModal("none")}
        />
      )}
      {modal === "preview" && (
        <PreviewOverlay
          fields={doc.fields}
          theme={doc.theme}
          variant={doc.variant}
          device={device}
          onClose={() => setModal("none")}
        />
      )}

      <Toaster position="bottom-right" />
    </div>
  )
}
