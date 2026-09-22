import React, { useEffect, useMemo, useState } from "react"
import { createRoot } from "react-dom/client"
import { CodeBlock, LiveDemo, Callout, PropertyTable, PrevNext } from "./components/DocComponents"
import {
  DOC_PAGES,
  EXAMPLE_BASIC,
  EXAMPLE_CONDITIONAL,
  EXAMPLE_GROUP,
  EXAMPLE_STYLED,
  CODE_QUICKSTART,
  CODE_CANONICAL,
  CODE_TYPED,
  CODE_ZOD,
  CODE_ENDPOINT,
  CODE_THEME,
  CODE_CUSTOM_CSS,
  CODE_JSON_SCHEMA,
  CODE_AI_PROMPT,
} from "./lib/docs-content"
import "./docs.css"

function routeFromHash(): string {
  const hash = window.location.hash.replace(/^#\/?/, "")
  return hash
}

function navigate(route: string) {
  window.location.hash = route ? `/${route}` : "/"
}

function useRoute(): string {
  const [route, setRoute] = useState(routeFromHash())
  useEffect(() => {
    const onChange = () => {
      setRoute(routeFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return route
}

function PageShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="page-title">{title}</h1>
      <article>{children}</article>
    </>
  )
}

function renderPage(route: string) {
  switch (route) {
    case "":
      return (
        <>
          <div className="eyebrow">Developer-first React forms</div>
          <h1>Build forms visually.<br /><em>Export real React.</em></h1>
          <p className="lead">Use Schema Studio to design a form, export readable TypeScript or JavaScript, and keep ownership of the final implementation.</p>
          <div className="actions">
            <a className="button primary" href="#/docs/getting-started">Get started</a>
            <a className="button" href="./studio/">Open Schema Studio</a>
          </div>
          <div className="workflow">
            <div><b>01</b><strong>Design</strong><span>Build visually in Studio</span></div>
            <div><b>02</b><strong>Export</strong><span>Copy a real React component</span></div>
            <div><b>03</b><strong>Own</strong><span>Keep the code in your app</span></div>
          </div>
          <section>
            <div className="section-label">The core idea</div>
            <h2>One schema, every layer</h2>
            <p>The same field definition drives rendering, visibility, validation integration, Studio preview, and generated code.</p>
            <CodeBlock code={CODE_CANONICAL} />
            <LiveDemo fields={EXAMPLE_CONDITIONAL} />
          </section>
        </>
      )
    case "docs/getting-started":
      return (
        <PageShell eyebrow="First steps" title="Getting started">
          <p>Install the package and render your first form in a few lines.</p>
          <CodeBlock code="npm install ki-forms" language="bash" />
          <CodeBlock code={CODE_QUICKSTART} />
          <p>Use string shorthand for simple forms, or keep a named field constant when you need conditions, types, and generated code.</p>
          <LiveDemo fields={EXAMPLE_BASIC} />
        </PageShell>
      )
    case "docs/schema":
      return (
        <PageShell eyebrow="Canonical schema" title="Schema reference">
          <p>Fields are plain serializable objects. Names become submitted value keys and must be unique.</p>
          <PropertyTable rows={[
            ["name", "Submitted value key"],
            ["type", "Built-in field renderer"],
            ["required", "Required when visible"],
            ["showIf", "Visibility and conditional validation"],
            ["options", "Select choices"],
            ["defaultValue", "Initial value"],
            ["placeholder", "Input placeholder"],
            ["helperText", "Supporting text"],
            ["className", "Field-specific CSS class"],
            ["minLength / maxLength", "Text length bounds (non-empty values)"],
            ["pattern", "Regex text-like values must match"],
            ["min / max", "Numeric range for number fields"],
          ]} />
          <CodeBlock code={CODE_CANONICAL} />
        </PageShell>
      )
    case "docs/conditions":
      return (
        <PageShell eyebrow="Single source of truth" title="Conditions">
          <p><code>showIf</code> controls visibility. <code>required: true</code> means required when the field is visible. Never duplicate the same rule in a separate map.</p>
          <CodeBlock code={CODE_CANONICAL} />
          <LiveDemo fields={EXAMPLE_CONDITIONAL} />
          <h2>Groups</h2>
          <p>Use <code>all</code> when every condition must match, or <code>any</code> when one match is enough. A top-level condition combines with groups via AND.</p>
          <p>In Schema Studio, select a field and choose “All of these (AND)” or “Any of these (OR)” under “Show only if” — conditions can be added, edited, and removed visually, with a readable summary and warnings for unknown fields.</p>
          <LiveDemo fields={EXAMPLE_GROUP} />
          <Callout title="Deprecated compatibility">The legacy <code>requiredWhen</code> option is retained only for compatibility. New schemas use <code>showIf</code> plus <code>required</code>.</Callout>
        </PageShell>
      )
    case "docs/typescript":
      return (
        <PageShell eyebrow="Typed values" title="TypeScript">
          <p>Static field definitions can infer the shape of submitted values. Runtime JSON loaded from an API cannot create compile-time types by itself.</p>
          <CodeBlock code={CODE_TYPED} />
          <Callout title="Boundary rule">Validate dynamic data at the application boundary and provide an explicit type where needed.</Callout>
        </PageShell>
      )
    case "docs/zod":
      return (
        <PageShell eyebrow="Validation" title="Zod validation">
          <p>Use your own Zod instance with the optional adapter. Conditional requiredness comes from <code>showIf</code> plus <code>required: true</code>. Built-in constraints (<code>minLength</code>, <code>maxLength</code>, <code>pattern</code>, <code>min</code>, <code>max</code>) are checked for visible, non-empty values — <code>required</code> owns emptiness.</p>
          <CodeBlock code={CODE_ZOD} />
          <p>Use code-first Zod for complex refinements and maximum type inference.</p>
          <p>Studio can also generate the schema for you: open Code → React component → check “Include Zod validation”. The generated component carries a readable <code>z.object</code> schema with conditional rules derived from <code>showIf</code>, plus a <code>z.infer</code> type for the submit handler.</p>
          <LiveDemo fields={EXAMPLE_CONDITIONAL} />
        </PageShell>
      )
    case "docs/studio":
      return (
        <PageShell eyebrow="Visual authoring" title="Schema Studio">
          <ol>
            <li>Design the form visually.</li>
            <li>Open Code and review the generated output — optionally with Zod validation.</li>
            <li>Copy the component into your application.</li>
            <li>Paste JSON, a full document, or previously exported component code back under Schema JSON / Import code to keep iterating.</li>
          </ol>
          <a className="text-link" href="./studio/">Open Schema Studio →</a>
        </PageShell>
      )
    case "docs/export":
      return (
        <PageShell eyebrow="Own the code" title="React export">
          <p>Generated output includes the fields, styles import, variant, theme, endpoint, and serializable field properties.</p>
          <p>Check “Include Zod validation” for a readable <code>z.object</code> schema plus a <code>z.infer</code> submit type. “Copy importable” adds a hidden schema block so the component can be pasted back into Studio under Import code.</p>
          <p>Arbitrary callbacks such as <code>onChange</code> are application code, not portable JSON. The exporter reports them as warnings instead of silently discarding behavior.</p>
          <CodeBlock code={CODE_QUICKSTART} />
        </PageShell>
      )
    case "docs/endpoints":
      return (
        <PageShell eyebrow="Collect responses" title="Endpoint submissions">
          <p>An endpoint sends <code>{"{ values, meta }"}</code> from the browser.</p>
          <CodeBlock code={CODE_ENDPOINT} />
          <Callout title="Security boundary">The URL is public and must not contain secrets. Use your own server as a proxy for private webhooks or API keys.</Callout>
        </PageShell>
      )
    case "docs/styling":
      return (
        <PageShell eyebrow="Visual system" title="Styling and themes">
          <p>Import the built-in stylesheet and override visual tokens with the theme prop.</p>
          <CodeBlock code={CODE_THEME} />
          <LiveDemo fields={EXAMPLE_STYLED} />
          <p>For one-off visual tweaks, Studio offers scoped <a className="text-link" href="#/docs/custom-css">custom CSS</a> that previews live and exports as a separate artifact.</p>
        </PageShell>
      )
    case "docs/custom-css":
      return (
        <PageShell eyebrow="Scoped preview" title="Custom CSS">
          <p>Write document-level CSS in the Studio Style panel. The canvas and Preview render it scoped under <code>[data-ki-preview=&quot;studio&quot;]</code>, so Studio chrome is never affected. The ki-forms runtime never injects CSS — the export is a separate artifact your app owns.</p>
          <CodeBlock code={CODE_CUSTOM_CSS} language="css" />
          <Callout title="Guards">20,000-character cap; <code>&lt;/style&gt;</code>, <code>&lt;/script&gt;</code>, and HTML comments are rejected and never applied. Imports carry custom CSS with the document.</Callout>
          <p>Export via Code → CSS (copy or download <code>form.css</code>), then paste it into your own stylesheet under your own form container.</p>
        </PageShell>
      )
    case "docs/ai":
      return (
        <PageShell eyebrow="Bring your own key" title="AI generation">
          <p>Open the AI panel in the Studio left rail, describe the form, and review the proposed schema before anything touches the canvas. AI proposes — you dispose.</p>
          <CodeBlock code={CODE_AI_PROMPT} language="text" />
          <p>Any OpenAI-compatible <code>/chat/completions</code> endpoint works (default <code>https://api.openai.com/v1</code>, model <code>gpt-4o-mini</code>). Output is validated with the canonical importer — failures show path-specific errors and nothing is applied. Applying over a non-empty canvas asks for confirmation.</p>
          <Callout title="Key privacy">The API key lives in <code>sessionStorage</code> only — never the document, localStorage, or share links. Requests go straight from your browser to the provider.</Callout>
        </PageShell>
      )
    case "docs/json-schema":
      return (
        <PageShell eyebrow="Editor + LLM contract" title="Formal JSON Schema">
          <p>ki-forms ships a draft-07 JSON Schema as <code>ki-forms/schema.json</code>, mirroring the canonical TypeScript validator. It backs editor autocomplete and the AI prompt contract.</p>
          <CodeBlock code={CODE_JSON_SCHEMA} language="json" />
          <p>Add <code>&quot;$schema&quot;: &quot;ki-forms/schema.json&quot;</code> at the document top level for autocomplete and LLM output validation — imports ignore the key.</p>
          <Callout title="Canonical validator">The TypeScript validator stays canonical. Duplicate field names, cross-property range checks, and regex compilability are rejected only by it — see the schema description for the full divergence list.</Callout>
        </PageShell>
      )
    case "docs/accessibility":
      return (
        <PageShell eyebrow="Inclusive forms" title="Accessibility">
          <p>Built-in fields associate labels and controls, expose validation state, and render errors near the field.</p>
          <p>Custom components receive <code>field</code>, <code>value</code>, <code>error</code>, and <code>onChange</code>, and are responsible for their own semantic markup and focus behavior.</p>
          <LiveDemo fields={EXAMPLE_CONDITIONAL} />
        </PageShell>
      )
    case "docs/limitations":
      return (
        <PageShell eyebrow="Focused scope" title="Limitations and roadmap">
          <p>The current core focuses on flat, JSON-serializable forms. Nested objects, repeatable field arrays, and file uploads are intentionally deferred until they can be designed consistently across schema, runtime, Studio, TypeScript, Zod, export, and submission.</p>
        </PageShell>
      )
    case "playground":
      return (
        <PageShell eyebrow="Live examples" title="Playground">
          <h2>Basic</h2>
          <LiveDemo fields={EXAMPLE_BASIC} />
          <h2>Conditional</h2>
          <LiveDemo fields={EXAMPLE_CONDITIONAL} />
          <h2>Condition groups</h2>
          <LiveDemo fields={EXAMPLE_GROUP} />
          <h2>Themed</h2>
          <LiveDemo fields={EXAMPLE_STYLED} />
        </PageShell>
      )
    default:
      return (
        <PageShell eyebrow="Not found" title="Unknown page">
          <p>This documentation page does not exist.</p>
          <a className="text-link" href="#/">Back to documentation home →</a>
        </PageShell>
      )
  }
}

function App() {
  const route = useRoute()
  const [query, setQuery] = useState("")
  const [drawer, setDrawer] = useState(false)
  const navPages = useMemo(() => DOC_PAGES.filter((p) => p.id !== "home"), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return navPages
    return navPages.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(q))
  }, [navPages, query])
  const index = useMemo(() => navPages.findIndex((p) => p.route === route), [navPages, route])
  const prev = index > 0 ? navPages[index - 1] : null
  const next = index >= 0 && index < navPages.length - 1 ? navPages[index + 1] : null

  return (
    <div className="site">
      <header>
        <button className="brand" onClick={() => navigate("")}><span>ki</span>-forms</button>
        <nav>
          <button type="button" className="nav-docs" onClick={() => navigate("docs/getting-started")}>Docs</button>
          <a href="./studio/">Studio</a>
          <a href="https://github.com/kadirulislam/ki-forms">GitHub</a>
          <button type="button" className="drawer-toggle" aria-label="Open documentation navigation" onClick={() => setDrawer(true)}>☰</button>
        </nav>
      </header>
      <div className="layout">
        <aside className="sidebar" aria-label="Documentation navigation">
          <input
            type="search"
            placeholder="Search docs…"
            aria-label="Search documentation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.map((page) => (
            <a
              key={page.id}
              href={`#/${page.route}`}
              className={route === page.route ? "active" : ""}
              aria-current={route === page.route ? "page" : undefined}
            >
              <strong>{page.title}</strong>
              <span>{page.description}</span>
            </a>
          ))}
          {filtered.length === 0 && <p className="empty">No pages match.</p>}
        </aside>
        <main>
          {renderPage(route)}
          {index >= 0 && <PrevNext prev={prev} next={next} onNavigate={navigate} />}
        </main>
      </div>
      {drawer && (
        <>
          <div className="scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="drawer" role="dialog" aria-label="Documentation navigation">
            <button type="button" aria-label="Close navigation" onClick={() => setDrawer(false)}>✕</button>
            {navPages.map((page) => (
              <a key={page.id} href={`#/${page.route}`} onClick={() => setDrawer(false)} className={route === page.route ? "active" : ""}>
                {page.title}
              </a>
            ))}
          </div>
        </>
      )}
      <footer>ki-forms · portable schemas for React · <a href="https://github.com/kadirulislam/ki-forms">MIT licensed</a></footer>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
