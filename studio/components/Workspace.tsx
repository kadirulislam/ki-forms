import { useState } from "react"
import { KiForm } from "../../src/renderer/KiForm"
import type { Field } from "../../src/types"
import { toJson, toReactSnippet } from "../lib/export"

export type WorkspaceProps = {
  fields: Field[]
  jsonText: string
  jsonError: string | null
  onJsonTextChange: (text: string) => void
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (label: string, text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(label)
        setTimeout(() => setCopied(null), 1600)
      })
      .catch(() => setCopied("error"))
  }
  return { copied, copy }
}

function CopyButton({ onClick, done }: { onClick: () => void; done: boolean }) {
  return (
    <button type="button" className="st-copybtn" onClick={onClick}>
      {done ? "copied!" : "copy"}
    </button>
  )
}

export function Workspace({ fields, jsonText, jsonError, onJsonTextChange }: WorkspaceProps) {
  const [tab, setTab] = useState<"preview" | "json" | "export">("preview")
  const [result, setResult] = useState<string | null>(null)
  const { copied, copy } = useCopy()

  const snippet = toReactSnippet("MyForm", fields)

  return (
    <section className="st-workspace">
      <div className="st-tabs" role="tablist">
        {(["preview", "json", "export"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={"st-tab" + (tab === t ? " st-tab-active" : "")}
            onClick={() => setTab(t)}
          >
            {t === "preview" ? "Preview" : t === "json" ? "JSON" : "Export"}
          </button>
        ))}
        <span className="st-tabs-spacer" />
        {tab === "json" && (
          <span className={"st-status" + (jsonError ? " st-status-err" : " st-status-ok")}>
            {jsonError ? `✕ ${jsonError}` : "✓ valid schema"}
          </span>
        )}
      </div>

      {tab === "preview" && (
        <div className="st-tabpane st-pane-preview">
          <KiForm
            key={toJson(fields)}
            fields={fields}
            onSubmit={(values) => setResult(JSON.stringify(values, null, 2))}
          />
          {result && (
            <div className="st-result">
              <div className="st-result-head">
                <span>onSubmit values</span>
                <button type="button" onClick={() => setResult(null)}>
                  clear
                </button>
              </div>
              <pre>{result}</pre>
            </div>
          )}
        </div>
      )}

      {tab === "json" && (
        <div className="st-tabpane st-pane-json">
          <textarea
            className="st-json-editor"
            spellCheck={false}
            value={jsonText}
            onChange={(e) => onJsonTextChange(e.target.value)}
          />
        </div>
      )}

      {tab === "export" && (
        <div className="st-tabpane st-pane-export">
          <div className="st-export-block">
            <div className="st-export-head">
              <span>schema.json</span>
              <CopyButton onClick={() => copy("json", toJson(fields))} done={copied === "json"} />
            </div>
            <pre>{toJson(fields)}</pre>
          </div>
          <div className="st-export-block">
            <div className="st-export-head">
              <span>MyForm.tsx</span>
              <CopyButton onClick={() => copy("react", snippet)} done={copied === "react"} />
            </div>
            <pre>{snippet}</pre>
          </div>
          {copied === "error" && <p className="st-status-err">Clipboard unavailable — select the text and copy manually.</p>}
          <p className="st-hint">
            The snippet uses the real <code>ki-forms</code> API — paste it into any React 18+ project after{" "}
            <code>npm i ki-forms</code> and import <code>ki-forms/styles.css</code>.
          </p>
        </div>
      )}
    </section>
  )
}
