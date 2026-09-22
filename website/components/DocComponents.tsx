import React, { useState } from "react"
import { KiForm } from "../../src"
import type { FieldInput, FormValues } from "../../src"

export function CodeBlock({ code, language = "tsx" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="code-wrap">
      <div className="code-bar">
        <span>{language}</span>
        <button type="button" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="code-block"><code>{code}</code></pre>
    </div>
  )
}

export function LiveDemo({ fields, label = "// submit to inspect values" }: { fields: FieldInput[]; label?: string }) {
  const [values, setValues] = useState<FormValues | null>(null)
  return (
    <div className="demo-box">
      <KiForm fields={fields} onSubmit={setValues} />
      <pre>{values ? JSON.stringify(values, null, 2) : label}</pre>
    </div>
  )
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="callout" role="note">
      <b>{title}</b>
      <div>{children}</div>
    </div>
  )
}

export function PropertyTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="table" role="table" aria-label="Schema properties">
      <div><b>Property</b><b>Purpose</b></div>
      {rows.map(([name, purpose]) => (
        <div key={name}><code>{name}</code><span>{purpose}</span></div>
      ))}
    </div>
  )
}

export function PrevNext({ prev, next, onNavigate }: {
  prev: { route: string; title: string } | null
  next: { route: string; title: string } | null
  onNavigate: (route: string) => void
}) {
  return (
    <nav className="prev-next" aria-label="Documentation pages">
      {prev ? <button type="button" onClick={() => onNavigate(prev.route)}>← {prev.title}</button> : <span />}
      {next ? <button type="button" onClick={() => onNavigate(next.route)}>{next.title} →</button> : <span />}
    </nav>
  )
}

export function LandingShowcase({ fields, schemaCode, reactCode }: {
  fields: FieldInput[]
  schemaCode: string
  reactCode: string
}) {
  const [tab, setTab] = useState<"form" | "schema" | "react">("form")
  const [values, setValues] = useState<FormValues | null>(null)
  async function copy(text: string, done: () => void) {
    try {
      await navigator.clipboard.writeText(text)
      done()
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="showcase">
      <div className="showcase-tabs" role="tablist" aria-label="Showcase views">
        {(["form", "schema", "react"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t === "form" ? "Live form" : t === "schema" ? "Schema JSON" : "React export"}
          </button>
        ))}
        <a className="showcase-open" href="./studio/">Open in Studio →</a>
      </div>
      {tab === "form" && (
        <div className="showcase-pane">
          <KiForm fields={fields} onSubmit={setValues} />
          <pre>{values ? JSON.stringify(values, null, 2) : "// pick Admin to reveal the company field, then submit"}</pre>
        </div>
      )}
      {tab === "schema" && <ShowcaseCode code={schemaCode} language="json" onCopy={copy} />}
      {tab === "react" && <ShowcaseCode code={reactCode} language="tsx" onCopy={copy} />}
    </div>
  )
}

function ShowcaseCode({ code, language, onCopy }: {
  code: string
  language: string
  onCopy: (text: string, done: () => void) => void
}) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="code-wrap">
      <div className="code-bar">
        <span>{language}</span>
        <button type="button" onClick={() => onCopy(code, () => { setCopied(true); setTimeout(() => setCopied(false), 1400) })}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="code-block"><code>{code}</code></pre>
    </div>
  )
}
