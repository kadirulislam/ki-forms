import { describe, it, expect } from "vitest"
import { toJson, toReactSnippet, fieldSummary } from "../studio/lib/export"
import type { Field } from "../src/types"

describe("toJson", () => {
  it("pretty-prints with 2-space indent", () => {
    const out = toJson([{ name: "email", type: "email" }])
    expect(out).toBe(
      JSON.stringify([{ name: "email", type: "email" }], null, 2),
    )
    expect(out).toContain('\n    "name": "email"')
  })
})

describe("fieldSummary", () => {
  it("describes selects with option counts", () => {
    expect(fieldSummary({ name: "r", type: "select", options: ["A", "B"] })).toBe("select · 2 options")
  })

  it("falls back to text for untyped fields", () => {
    expect(fieldSummary({ name: "x" })).toBe("text")
  })
})

describe("toReactSnippet", () => {
  const fields: Field[] = [
    { name: "email", type: "email", placeholder: "you@co.com", required: true },
    { name: "bare", type: "text" },
    { name: "same", type: "text", label: "same" },
    { name: "renamed", type: "text", label: "Full name" },
    { name: "nologo", type: "checkbox", label: false },
    { name: "role", type: "select", options: ["User", "Admin"] },
    { name: "company", type: "text", showIf: { field: "role", equals: "Admin" } },
    { name: "taxId", type: "text", showIf: { all: [{ field: "role", equals: "Admin" }, { field: "country", equals: "US" }] } },
    { name: "promo", type: "text", showIf: { any: [{ field: "plan", equals: "Pro" }] } },
  ]

  const snippet = toReactSnippet("WaitlistForm", fields)

  it("imports the real library API", () => {
    expect(snippet).toContain('import { KiForm } from "ki-forms"')
  })

  it("uses the given component name", () => {
    expect(snippet).toContain("export default function WaitlistForm()")
  })

  it("emits string shorthand only for bare text fields", () => {
    expect(snippet).toContain('  "bare",')
    // non-text types must stay objects — shorthand "email" would render a text input
    expect(snippet).not.toContain('  "email",')
  })

  it("omits labels identical to the name but keeps meaningful ones", () => {
    expect(snippet).toContain('name: "renamed", type: "text", label: "Full name"')
  })

  it("emits label: false", () => {
    expect(snippet).toContain("label: false")
  })

  it("inlines string options arrays", () => {
    expect(snippet).toContain('options: ["User", "Admin"]')
  })

  it("renders single, all and any showIf", () => {
    expect(snippet).toContain('showIf: { field: "role", equals: "Admin" }')
    expect(snippet).toContain('showIf: { all: [{ field: "role", equals: "Admin" }, { field: "country", equals: "US" }] }')
    expect(snippet).toContain('showIf: { any: [{ field: "plan", equals: "Pro" }] }')
  })

  it("emits required and placeholder props", () => {
    expect(snippet).toContain("required: true")
    expect(snippet).toContain('placeholder: "you@co.com"')
  })

  it("omits theme and variant when default options are passed", () => {
    const plain = toReactSnippet("MyForm", [{ name: "email", type: "email" }], {})
    expect(plain).not.toContain("theme=")
    expect(plain).not.toContain("variant=")
  })

  it("emits conversational variant", () => {
    const conv = toReactSnippet("MyForm", [{ name: "email", type: "email" }], { variant: "conversational" })
    expect(conv).toContain('variant="conversational"')
  })

  it("emits a theme prop block with tokens", () => {
    const themed = toReactSnippet("MyForm", [{ name: "email", type: "email" }], {
      theme: { accentColor: "#8b5cf6", radius: "12px" },
    })
    expect(themed).toContain("theme={{")
    expect(themed).toContain('accentColor: "#8b5cf6"')
    expect(themed).toContain('radius: "12px"')
  })
})
