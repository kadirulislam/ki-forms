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

type Variant = "classic" | "conversational"
type Doc = { title: string; fields: Field[]; theme: KiTheme; variant: Variant }
type Panel = "blocks" | "style" | "form"

const STORAGE_KEY = "ki-studio-doc-v1"

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
    }
  } catch {
    return fallback()
  }
}

function savedLabel(at: number): string {
  const s = Math.round((Date.now() - at) / 1000)
  if (s < 8) return "Just now"
  if (s < 60) return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
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
  const [toast, setToast] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number>(() => Date.now())

  const flash = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 1800)
  }, [])

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
      setSavedAt(Date.now())
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
      flash(`Loaded "${tpl.name}"`)
    },
    [update, flash],
  )

  const applyJson = useCallback(
    (fields: Field[]) => {
      update((d) => ({ ...d, fields }))
      setSelected(null)
      flash("Schema applied")
    },
    [update, flash],
  )

  const copyReact = useCallback(() => {
    const d = docRef.current
    const snippet = toReactSnippet("MyForm", d.fields, { theme: d.theme, variant: d.variant })
    navigator.clipboard
      .writeText(snippet)
      .then(() => flash("React code copied — paste it into your app"))
      .catch(() => flash("Clipboard unavailable"))
  }, [flash])

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

  return (
    <div className="se-page" onKeyDown={onKeydown}>
      <header className="se-topbar">
        <div className="se-brand">
          <span className="se-logo">ki</span>
          <input
            className="se-title"
            value={doc.title}
            placeholder="Untitled form"
            aria-label="Form name"
            onChange={(e) => update((d) => ({ ...d, title: e.target.value }), true)}
          />
        </div>

        <div className="se-topbar-center">
          <button type="button" className="se-iconbtn" title="Undo (Ctrl+Z)" disabled={past.length === 0} onClick={undo}>
            ↺
          </button>
          <button type="button" className="se-iconbtn" title="Redo (Ctrl+Shift+Z)" disabled={future.length === 0} onClick={redo}>
            ↻
          </button>
          <span className="se-saved">
            <span className="se-saved-dot" /> Last saved {savedLabel(savedAt)}
          </span>
          <span className="se-device">
            <button
              type="button"
              className={device === "desktop" ? "se-device-active" : ""}
              title="Desktop width"
              onClick={() => setDevice("desktop")}
            >
              ▭
            </button>
            <button
              type="button"
              className={device === "mobile" ? "se-device-active" : ""}
              title="Mobile width"
              onClick={() => setDevice("mobile")}
            >
              ▯
            </button>
          </span>
        </div>

        <div className="se-topbar-actions">
          <button type="button" className="se-btn se-btn-accent" onClick={() => setModal("templates")}>
            ⚡ Templates
          </button>
          <button type="button" className="se-btn" onClick={() => setModal("code")}>
            {"</>"} Code
          </button>
          <button type="button" className="se-btn" onClick={() => setModal("preview")}>
            ◉ Preview
          </button>
          <button type="button" className="se-btn se-btn-primary" onClick={copyReact}>
            ➤ Copy React code
          </button>
        </div>
      </header>

      <div className="se-body">
        <nav className="se-rail" aria-label="Panels">
          {(
            [
              { id: "blocks", icon: "⊞", label: "Blocks" },
              { id: "style", icon: "✎", label: "Style" },
              { id: "form", icon: "⚙", label: "Form" },
            ] as { id: Panel; icon: string; label: string }[]
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              className={"se-rail-item" + (panel === p.id ? " se-rail-active" : "")}
              onClick={() => setPanel(p.id)}
            >
              <span className="se-rail-icon">{p.icon}</span>
              <span className="se-rail-label">{p.label}</span>
            </button>
          ))}
        </nav>

        <aside className="se-sidepanel">
          <div className="se-sidepanel-tabs">
            {(
              [
                { id: "blocks", label: "Blocks" },
                { id: "style", label: "Design" },
                { id: "form", label: "Form" },
              ] as { id: Panel; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                className={"se-sidepanel-tab" + (panel === t.id ? " se-sidepanel-tab-active" : "")}
                onClick={() => setPanel(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="se-sidepanel-body">
            {panel === "blocks" && <BlocksPanel onAdd={(t) => addField(t)} />}
            {panel === "style" && <StylePanel theme={doc.theme} onChange={(theme) => update((d) => ({ ...d, theme }), true)} />}
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

        <main className={"se-canvas se-canvas-" + device} onClick={() => setSelected(null)}>
          <div className={"se-paper" + (device === "mobile" ? " se-paper-mobile" : "")}>
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
            <div className="se-inspector" onClick={(e) => e.stopPropagation()}>
              <div className="se-inspector-head">
                <span>Field settings</span>
                <button type="button" title="Close" onClick={() => setSelected(null)}>
                  ✕
                </button>
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

      {toast && <div className="se-toast">{toast}</div>}
    </div>
  )
}
