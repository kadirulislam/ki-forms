import { useCallback, useMemo, useState } from "react"
import type { Field } from "../src/types"
import { Palette } from "./components/Palette"
import { Canvas } from "./components/Canvas"
import { Inspector } from "./components/Inspector"
import { Workspace } from "./components/Workspace"
import { validateSchema } from "./lib/schema"
import { toJson, toReactSnippet } from "./lib/export"
import { TEMPLATES } from "./lib/templates"

const NEW_FIELD_SEEDS: Record<string, Partial<Field>> = {
  text: { type: "text", placeholder: "Short answer" },
  email: { type: "email", placeholder: "you@company.com" },
  password: { type: "password" },
  number: { type: "number" },
  textarea: { type: "textarea", placeholder: "Longer answer" },
  select: { type: "select", options: ["Option 1", "Option 2", "Option 3"] },
  checkbox: { type: "checkbox", label: "Check me" },
}

export default function App() {
  const [fields, setFields] = useState<Field[]>(() => {
    const tpl = TEMPLATES.find((t) => t.id === "signup") ?? TEMPLATES[0]
    const first = validateSchema(tpl.fields)
    return first.ok ? first.fields : []
  })
  const [jsonText, setJsonText] = useState<string>(() => toJson(fields))
  const [selected, setSelected] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flash = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 1800)
  }, [])

  /** Single source of truth: every change flows through the schema and back to JSON. */
  const commitFields = useCallback((next: Field[]) => {
    setFields(next)
    setJsonText(toJson(next))
  }, [])

  /** Edits made directly in the JSON tab. */
  const handleJsonTextChange = useCallback((text: string) => {
    setJsonText(text)
    try {
      const parsed: unknown = JSON.parse(text)
      const result = validateSchema(parsed)
      if (result.ok) setFields(result.fields)
    } catch {
      // Keep the last good fields while the JSON is still being typed.
    }
  }, [])

  const applyTemplate = useCallback(
    (id: string) => {
      const tpl = TEMPLATES.find((t) => t.id === id)
      if (!tpl) return
      const result = validateSchema(tpl.fields)
      commitFields(result.ok ? result.fields : [])
      setSelected(null)
      flash(`Loaded "${tpl.name}"`)
    },
    [commitFields, flash],
  )

  const uniqueName = useCallback((base: string, current: Field[]) => {
    let name = base
    let n = 2
    while (current.some((f) => f.name === name)) {
      name = `${base}_${n}`
      n++
    }
    return name
  }, [])

  const handleDrop = useCallback(
    (payload: { kind: "palette"; fieldType: string } | { kind: "move"; index: number }, at: number) => {
      setFields((current) => {
        let next: Field[]
        if (payload.kind === "palette") {
          const type = payload.fieldType
          const seed = NEW_FIELD_SEEDS[type] || { type: "text" as const }
          const newField: Field = {
            name: uniqueName(`${type}Field`, current),
            ...seed,
          }
          next = [...current]
          next.splice(Math.max(0, Math.min(at, next.length)), 0, newField)
        } else {
          const from = payload.index
          if (from === at || from + 1 === at) return current
          const moved = current[from]
          const without = current.filter((_, i) => i !== from)
          const target = at > from ? at - 1 : at
          next = [...without]
          next.splice(target, 0, moved)
        }
        setJsonText(toJson(next))
        return next
      })
    },
    [uniqueName],
  )

  const handleDelete = useCallback(
    (index: number) => {
      commitFields(fields.filter((_, i) => i !== index))
      setSelected((cur) => (cur === index ? null : cur !== null && cur > index ? cur - 1 : cur))
    },
    [fields, commitFields],
  )

  const handleDuplicate = useCallback(
    (index: number) => {
      const source = fields[index]
      if (!source) return
      const copy: Field = { ...source, name: uniqueName(`${source.name}_copy`, fields) }
      const next = [...fields]
      next.splice(index + 1, 0, copy)
      commitFields(next)
      setSelected(index + 1)
    },
    [fields, commitFields, uniqueName],
  )

  const patchField = useCallback(
    (index: number, patch: Partial<Field>) => {
      setFields((current) => {
        const next = current.map((f, i) => (i === index ? { ...f, ...patch } : f))
        setJsonText(toJson(next))
        return next
      })
    },
    [],
  )

  const selectedField = selected !== null ? fields[selected] : undefined
  const otherFields = useMemo(
    () => fields.filter((_, i) => i !== selected),
    [fields, selected],
  )

  /** Live validation of the JSON tab text, for the status line. */
  const jsonError = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(jsonText)
      const result = validateSchema(parsed)
      return result.ok ? null : result.error
    } catch (err) {
      return `Unexpected token — ${(err as Error).message}`
    }
  }, [jsonText])

  const copyExport = useCallback(
    (what: "json" | "react") => {
      const text = what === "json" ? toJson(fields) : toReactSnippet("MyForm", fields)
      navigator.clipboard
        .writeText(text)
        .then(() => flash(what === "json" ? "Schema JSON copied" : "React snippet copied"))
        .catch(() => flash("Clipboard unavailable"))
    },
    [fields, flash],
  )

  return (
    <div className="st-page">
      <header className="st-topbar">
        <div className="st-brand">
          <span className="st-logo">ki</span>
          <div>
            <h1>Schema Studio</h1>
            <p>Build the JSON. Own the form. AI-friendly schemas, zero lock-in.</p>
          </div>
        </div>
        <div className="st-actions">
          <button type="button" onClick={() => copyExport("json")}>Copy JSON</button>
          <button type="button" className="st-btn-primary" onClick={() => copyExport("react")}>
            Copy React code
          </button>
        </div>
      </header>

      <nav className="st-templates" aria-label="Templates">
        <span className="st-templates-label">Templates</span>
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" title={t.description} onClick={() => applyTemplate(t.id)}>
            {t.name}
          </button>
        ))}
      </nav>

      <main className="st-layout">
        <Palette />
        <Canvas
          fields={fields}
          selected={selected}
          onSelect={setSelected}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onDrop={handleDrop}
        />
        {selected !== null && selectedField ? (
          <Inspector field={selectedField} otherFields={otherFields} onChange={(patch) => patchField(selected, patch)} />
        ) : (
          <aside className="st-panel st-inspector st-inspector-empty">
            <div className="st-panel-title">Field settings</div>
            <p className="st-hint">Select a field on the canvas to edit its properties.</p>
          </aside>
        )}
      </main>

      <Workspace
        fields={fields}
        jsonText={jsonText}
        jsonError={jsonError}
        onJsonTextChange={handleJsonTextChange}
      />

      {toast && <div className="st-toast">{toast}</div>}
    </div>
  )
}
