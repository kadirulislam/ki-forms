import { useEffect, useState } from "react"
import type { Field, KiTheme } from "../../src/types"
import { KiForm } from "../../src/renderer/KiForm"
import { toJson, toReactSnippet } from "../lib/export"
import { validateSchema } from "../lib/schema"
import { TEMPLATES } from "../lib/templates"

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
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-modal-head">
          <h3>Start from a template</h3>
          <button type="button" className="pm-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pm-template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="pm-template"
              onClick={() => onPick(t.id)}
            >
              <strong>{t.name}</strong>
              <span>{t.description}</span>
              <em>{t.fields.length} fields</em>
            </button>
          ))}
        </div>
      </div>
    </div>
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
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm-modal pm-modal-code" onClick={(e) => e.stopPropagation()}>
        <div className="pm-modal-head">
          <div className="pm-tabs">
            <button type="button" className={tab === "json" ? "pm-tab-active" : ""} onClick={() => setTab("json")}>
              Schema JSON
            </button>
            <button type="button" className={tab === "react" ? "pm-tab-active" : ""} onClick={() => setTab("react")}>
              React component
            </button>
          </div>
          <div className="pm-modal-head-actions">
            {tab === "json" && (
              <button type="button" className="pm-apply" onClick={apply}>
                Apply changes
              </button>
            )}
            <button type="button" className="pm-copy" onClick={copy}>
              {copied ? "copied!" : "copy"}
            </button>
            <button type="button" className="pm-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        {tab === "json" ? (
          <>
            <textarea
              className="pm-json"
              spellCheck={false}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <div className="pm-error">✕ {error}</div>}
            {!error && <div className="pm-ok">✓ valid schema — press “Apply changes” to sync the canvas</div>}
          </>
        ) : (
          <pre className="pm-react">{snippet}</pre>
        )}
      </div>
    </div>
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
    <div className="pm-backdrop pm-backdrop-preview" onClick={onClose}>
      <div className={"pm-preview pm-" + device} onClick={(e) => e.stopPropagation()}>
        <div className="pm-preview-head">
          <span className="pm-preview-chip">{device === "mobile" ? "Mobile · 390px" : "Desktop"}</span>
          <span className="pm-preview-chip">{variant === "conversational" ? "Conversational" : "Classic"}</span>
          <span className="pm-preview-hint">This is exactly what your users will see</span>
          <button type="button" className="pm-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="pm-preview-body">
          <KiForm fields={fields} theme={theme} variant={variant} onSubmit={(values) => setResult(JSON.stringify(values, null, 2))} />
          {result && (
            <div className="pm-preview-result">
              <strong>onSubmit received</strong>
              <pre>{result}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
