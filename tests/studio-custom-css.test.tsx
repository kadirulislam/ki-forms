import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import {
  MAX_CUSTOM_CSS,
  PREVIEW_SCOPE_VALUE,
  scopeCustomCss,
  validateCustomCss,
} from "../studio/lib/css"
import { parseDocumentImport } from "../studio/lib/schema"
import { CodeModal } from "../studio/components/Modals"
import { StylePanel } from "../studio/components/StylePanel"

const SCOPE = `[data-ki-preview="${PREVIEW_SCOPE_VALUE}"]`

function activateTab(name: string | RegExp) {
  const t = screen.getByRole("tab", { name })
  t.focus()
  fireEvent.mouseDown(t)
  fireEvent.mouseUp(t)
  fireEvent.click(t)
}

describe("scoped custom CSS (2.5.0)", () => {
  it("prefixes selectors with the preview scope", () => {
    const out = scopeCustomCss(`.a { color: red; }`)
    expect(out.startsWith(`${SCOPE} .a {`)).toBe(true)
    expect(out).toContain("color: red;")
    expect(out).not.toMatch(/(^|[,}])\s*\.a\s*\{/)
  })

  it("prefixes each comma selector independently", () => {
    const out = scopeCustomCss(`.a, .b { color: red; }`)
    expect(out).toContain(`${SCOPE} .a`)
    expect(out).toContain(`${SCOPE} .b`)
    expect(out).not.toMatch(/(^|[,}])\s*\.b\s*\{/)
  })

  it("recurses into @media but leaves @keyframes and @font-face alone", () => {
    const out = scopeCustomCss(
      `@media (max-width: 600px) { .a { color: red; } } @keyframes spin { from { opacity: 0; } }`,
    )
    expect(out).toContain(`@media (max-width: 600px) {\n${SCOPE} .a { color: red; }`)
    expect(out).toContain(`@keyframes spin { from { opacity: 0; } }`)
  })

  it("strips comments and tolerates empty input", () => {
    expect(scopeCustomCss(`/* hi */ .a { color: red; }`)).toContain(`${SCOPE} .a`)
    expect(scopeCustomCss(`/* hi */ .a { color: red; }`)).not.toContain("hi")
    expect(scopeCustomCss("")).toBe("")
    expect(scopeCustomCss("   ")).toBe("")
  })

  it("keeps unbalanced input instead of dropping it", () => {
    expect(scopeCustomCss(`.a { color: red;`)).toContain(".a { color: red;")
  })

  it("validates size and HTML breakouts", () => {
    expect(validateCustomCss(undefined).ok).toBe(true)
    expect(validateCustomCss("").ok).toBe(true)
    expect(validateCustomCss(".a{}").ok).toBe(true)
    expect(validateCustomCss("x".repeat(MAX_CUSTOM_CSS + 1)).ok).toBe(false)
    expect(validateCustomCss(`.a{}</STYLE><script>`).ok).toBe(false)
    expect(validateCustomCss(`.a{}<!--`).ok).toBe(false)
    expect(validateCustomCss(42).ok).toBe(false)
  })

  it("document import carries valid custom CSS and rejects breakouts", () => {
    const ok = parseDocumentImport({
      version: 1,
      fields: [{ name: "email" }],
      customCss: ".a { color: red; }",
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.doc.customCss).toBe(".a { color: red; }")

    const bad = parseDocumentImport({
      version: 1,
      fields: [{ name: "email" }],
      customCss: ".a{}</style>",
    })
    expect(bad.ok).toBe(false)

    const bare = parseDocumentImport([{ name: "email" }])
    expect(bare.ok).toBe(true)
    if (bare.ok) expect("customCss" in bare.doc).toBe(false)
  })

  it("code modal exports CSS in its own tab", async () => {
    render(
      <CodeModal
        fields={[{ name: "email" }]}
        theme={{}}
        variant="classic"
        customCss=".a { color: red; }"
        onApplyDocument={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    activateTab("CSS")
    await waitFor(() => expect(screen.getByLabelText("Custom CSS export")).toBeTruthy())
    expect(screen.getByLabelText("Custom CSS export").textContent).toContain(".a { color: red; }")
    expect(screen.getByRole("button", { name: "Download .css" })).toBeTruthy()
  })

  it("code modal shows an empty state without custom CSS", async () => {
    render(
      <CodeModal
        fields={[{ name: "email" }]}
        theme={{}}
        variant="classic"
        onApplyDocument={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    activateTab("CSS")
    await waitFor(() => expect(screen.getByText(/No custom CSS yet/)).toBeTruthy())
  })

  it("style panel edits CSS and flags breakouts", () => {
    const onCustomCss = vi.fn()
    render(
      <StylePanel
        theme={{}}
        preset={null}
        presetDark={false}
        onPreset={vi.fn()}
        onPresetMode={vi.fn()}
        onTokens={vi.fn()}
        onClearPreset={vi.fn()}
        customCss=""
        onCustomCss={onCustomCss}
      />,
    )
    fireEvent.change(screen.getByLabelText("Custom CSS"), { target: { value: ".a{}" } })
    expect(onCustomCss).toHaveBeenCalledWith(".a{}")

    render(
      <StylePanel
        theme={{}}
        preset={null}
        presetDark={false}
        onPreset={vi.fn()}
        onPresetMode={vi.fn()}
        onTokens={vi.fn()}
        onClearPreset={vi.fn()}
        customCss=".a{}</style>"
        onCustomCss={vi.fn()}
      />,
    )
    expect(screen.getByRole("alert").textContent).toMatch(/<\/style>/)
  })
})
