import { useState } from "react"
import { createRoot } from "react-dom/client"
import { KiForm, useKiForm } from "../src"
import type { FormValues } from "../src"

// ---------- shared bits ----------

function Result({ values, label }: { values: FormValues | null; label: string }) {
  if (!values) {
    return <pre className="result empty">// submit to see {label}</pre>
  }
  return <pre className="result">{JSON.stringify(values, null, 2)}</pre>
}

function Card({
  title,
  tag,
  tagGreen,
  children,
}: {
  title: string
  tag: string
  tagGreen?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>{title}</h3>
        <span className={tagGreen ? "tag tag-green" : "tag"}>{tag}</span>
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}

function useSubmit() {
  const [values, setValues] = useState<FormValues | null>(null)
  return { values, onSubmit: (v: FormValues) => setValues({ ...v }) }
}

// ---------- custom rating component (components-override demo) ----------

function RatingField({ field, value, onChange }: any) {
  const stars = 5
  return (
    <div className="ki-form-item">
      {field.label !== false && <label className="ki-label">{field.label}</label>}
      <div style={{ display: "flex", gap: 6, fontSize: 24, cursor: "pointer", lineHeight: 1 }}>
        {Array.from({ length: stars }, (_, i) => {
          const n = i + 1
          return (
            <span
              key={n}
              onClick={() => onChange(n)}
              style={{ color: n <= (value || 0) ? "#facc15" : "#334155" }}
              title={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </span>
          )
        })}
      </div>
      {field.helperText && <p className="ki-helper">{field.helperText}</p>}
    </div>
  )
}

// ---------- live schema editor (mini schema-studio) ----------

const SCHEMA_EXAMPLES: Record<string, any[]> = {
  "Signup": [
    { name: "email", type: "email", required: true, helperText: "We never share it" },
    "password",
    { name: "role", options: ["User", "Admin"] },
    { name: "company", showIf: { field: "role", equals: "Admin" } },
    { name: "terms", type: "checkbox", label: "I agree to the terms" },
  ],
  "Feedback": [
    { name: "name", required: true },
    { name: "rating", options: ["Awesome", "Good", "Meh"] },
    { name: "comments", type: "textarea", label: "Anything else?" },
    { name: "canContact", type: "checkbox", label: "You may contact me" },
  ],
  "Job application": [
    { name: "fullName", required: true },
    "email",
    { name: "years", type: "number", label: "Years of experience" },
    { name: "stack", options: ["React", "Vue", "Svelte"] },
    { name: "portfolio", showIf: { field: "stack", notEquals: "" } },
  ],
}

function SchemaEditor() {
  const [exampleName, setExampleName] = useState("Signup")
  const [text, setText] = useState(() => JSON.stringify(SCHEMA_EXAMPLES["Signup"], null, 2))
  const [fields, setFields] = useState<any[] | null>(SCHEMA_EXAMPLES["Signup"])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<FormValues | null>(null)

  function apply(nextText: string, nextName?: string) {
    setText(nextText)
    if (nextName) setExampleName(nextName)
    try {
      const parsed = JSON.parse(nextText)
      if (!Array.isArray(parsed)) throw new Error("Root must be an array of fields")
      for (const item of parsed) {
        if (typeof item !== "string" && (typeof item !== "object" || item === null || !item.name)) {
          throw new Error('Every field must be a string or an object with a "name"')
        }
      }
      setFields(parsed)
      setError(null)
      setVersion((v) => v + 1)
      setResult(null)
    } catch (e: any) {
      setError(e?.message ?? "Invalid JSON")
    }
  }

  return (
    <section className="section" id="editor">
      <div className="section-title">
        <h2>Schema studio (mini)</h2>
        <span>edit the JSON → the form re-renders instantly</span>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>fields = [ ... ]</h3>
          <div className="editor-tools">
            {Object.keys(SCHEMA_EXAMPLES).map((key) => (
              <button
                key={key}
                className={key === exampleName ? "example-btn active" : "example-btn"}
                onClick={() => apply(JSON.stringify(SCHEMA_EXAMPLES[key], null, 2), key)}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className="editor-grid">
          <div>
            <p className="pane-label">schema.json</p>
            <textarea
              className="schema-input"
              value={text}
              spellCheck={false}
              onChange={(e) => apply(e.target.value)}
            />
            <div style={{ marginTop: 10 }}>
              {error ? (
                <span className="editor-status err">✕ {error}</span>
              ) : (
                <span className="editor-status ok">✓ live — {fields?.length ?? 0} fields</span>
              )}
            </div>
          </div>

          <div>
            <p className="pane-label">rendered form</p>
            {fields && fields.length > 0 ? (
              <KiForm key={version} fields={fields} onSubmit={(v) => setResult({ ...v })} />
            ) : (
              <p className="hint">Add at least one field…</p>
            )}
            <div style={{ marginTop: 14 }}>
              <Result values={result} label="the submission" />
            </div>
          </div>
        </div>
      </section>
    </section>
  )
}

// ---------- app ----------

function Demo() {
  const quick = useSubmit()
  const cond = useSubmit()
  const signup = useSubmit()
  const feedback = useSubmit()
  const conv = useSubmit()

  const form = useKiForm({
    fields: [
      { name: "email", type: "email", required: true },
      { name: "role", options: ["Developer", "Designer", "Founder"] },
    ],
    onSubmit: (v) => console.log("controlled submit:", v),
  })

  return (
    <div className="page">
      <div className="glow" />

      <header className="hero">
        <span className="hero-badge">⚡ ki-forms v2.1 — hardened core</span>
        <h1>
          <span className="k">JSON in.</span> Forms out.
        </h1>
        <p>
          Every form below is the real library — typed end to end, 18/18 compat tests
          green, zero runtime deps. Define as data, render as React.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#playground">Try the forms</a>
          <a className="btn" href="#controlled">Controlled mode</a>
          <a className="btn" href="../studio/">Open Schema Studio ↗</a>
        </div>
      </header>

      <div className="features">
        <div className="feature"><span className="dot" /><div><b>Smart defaults</b><span>types, labels & placeholders inferred</span></div></div>
        <div className="feature"><span className="dot" /><div><b>Conditional fields</b><span>showIf equals / notEquals</span></div></div>
        <div className="feature"><span className="dot" /><div><b>Schema validation</b><span>Zod-compatible safeParse</span></div></div>
        <div className="feature"><span className="dot" /><div><b>Swappable UI</b><span>override any field component</span></div></div>
      </div>

      <section className="section" id="playground">
        <div className="section-title">
          <h2>Live playground</h2>
          <span>real renders · real submissions</span>
        </div>

        <div className="grid">
          <Card title="Quick start" tag='fields={["email"]}' tagGreen>
            <code className="code">{`<KiForm
  fields={["email", "password"]}
  onSubmit={save}
/>`}</code>
            <KiForm fields={["email", "password"]} onSubmit={quick.onSubmit} />
            <Result values={quick.values} label="the values" />
          </Card>

          <Card title="Conditional fields" tag="showIf">
            <KiForm
              fields={[
                { name: "role", options: ["User", "Admin"] },
                { name: "company", showIf: { field: "role", equals: "Admin" } },
              ]}
              onSubmit={cond.onSubmit}
            />
            <p className="hint">Pick “Admin” → company appears. Hidden fields still submit <code>""</code>.</p>
            <Result values={cond.values} label="the values" />
          </Card>

          <Card title="Validation + checkbox" tag="new in 2.1" tagGreen>
            <KiForm
              fields={[
                { name: "email", type: "email", required: true, helperText: "We never share it" },
                { name: "age", type: "number", label: "Age" },
                { name: "terms", type: "checkbox", label: "I agree to the terms" },
              ]}
              onSubmit={signup.onSubmit}
            />
            <p className="hint">Submit empty → inline error. Age submits as a real number.</p>
            <Result values={signup.values} label="the values" />
          </Card>

          <Card title="Conversational mode" tag="variant" tagGreen>
            <KiForm
              fields={[
                { name: "name", required: true },
                { name: "email", type: "email" },
              ]}
              variant="conversational"
              onSubmit={conv.onSubmit}
            />
            <p className="hint">One question per step. Enter to advance, Back to review.</p>
            <Result values={conv.values} label="the submission" />
          </Card>

          <Card title="Custom components" tag="components override">
            <KiForm
              fields={[
                { name: "stars", label: "How would you rate ki-forms?", helperText: "custom component, not a select" },
              ]}
              components={{ text: RatingField }}
              onSubmit={feedback.onSubmit}
            />
            <Result values={feedback.values} label="your rating" />
          </Card>
        </div>
      </section>

      <SchemaEditor />

      <section className="section" id="controlled">
        <div className="section-title">
          <h2>Controlled mode</h2>
          <span>useKiForm — own the state, read it anywhere</span>
        </div>

        <div className="grid">
          <Card title="Hook-driven form" tag="useKiForm">
            <code className="code">{`const form = useKiForm({ fields, onSubmit })
<KiForm form={form} />

form.values.email // read anywhere`}</code>
            <KiForm form={form} />
          </Card>

          <Card title="Live state" tag="reactive" tagGreen>
            <div className="state-row">
              <span className="chip">email: <b>{form.values.email || "∅"}</b></span>
              <span className="chip">role: <b>{form.values.role || "∅"}</b></span>
              <span className="chip">errors: <b>{JSON.stringify(form.errors)}</b></span>
            </div>
            <p className="hint">
              Type in the form on the left — these chips re-render live. That's the
              frozen <code>FormApi</code> shape: {"{ fields, values, errors, setValue, handleSubmit }"}
            </p>
            <code className="code">{`const { fields, values, errors,
  setValue, handleSubmit } = useKiForm(...)`}</code>
          </Card>
        </div>
      </section>

      <footer className="footer">
        built with the hardened v2.1 core · <code>npm run demo:build</code> produces this single file
      </footer>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Demo />)
