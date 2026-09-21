import { describe, it, expect } from "vitest"
import { validateSchema, parseDocumentImport } from "../studio/lib/schema"

describe("validateSchema", () => {
  it("rejects non-array input", () => {
    expect(validateSchema({ name: "x" }).ok).toBe(false)
    expect(validateSchema("email").ok).toBe(false)
    expect(validateSchema(null).ok).toBe(false)
  })

  it("accepts string shorthand as field names", () => {
    const r = validateSchema(["email", "password"])
    expect(r.ok).toBe(true)
  })

  it("treats unknown strings as field names (canonical shorthand)", () => {
    const r = validateSchema(["email", "banana"])
    expect(r.ok).toBe(true)
  })

  it("rejects objects without a name", () => {
    const r = validateSchema([{ type: "text" }])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain("Name is required")
  })

  it("rejects duplicate names", () => {
    const r = validateSchema([
      { name: "email", type: "email" },
      { name: "email", type: "text" },
    ])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain("Duplicate field name")
  })

  it("rejects unknown object types", () => {
    const r = validateSchema([{ name: "x", type: "banana" }])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain("Unknown field type")
  })

  it("rejects invalid label / placeholder / required / helperText", () => {
    expect(validateSchema([{ name: "x", label: 42 }]).ok).toBe(false)
    expect(validateSchema([{ name: "x", placeholder: 9 }]).ok).toBe(false)
    expect(validateSchema([{ name: "x", required: "yes" }]).ok).toBe(false)
    expect(validateSchema([{ name: "x", helperText: [] }]).ok).toBe(false)
  })

  it("accepts label: false", () => {
    expect(validateSchema([{ name: "x", label: false }]).ok).toBe(true)
  })

  it("rejects empty or malformed options", () => {
    expect(validateSchema([{ name: "s", type: "select", options: [] }]).ok).toBe(false)
    expect(validateSchema([{ name: "s", type: "select", options: [1, 2] }]).ok).toBe(false)
    expect(validateSchema([{ name: "s", type: "select", options: [{ label: "L" }] }]).ok).toBe(false)
  })

  it("accepts valid string and object options", () => {
    expect(validateSchema([{ name: "s", type: "select", options: ["A", "B"] }]).ok).toBe(true)
    expect(
      validateSchema([{ name: "s", type: "select", options: [{ label: "A", value: "a" }] }]).ok,
    ).toBe(true)
  })

  it("rejects showIf shapes that the renderer cannot evaluate", () => {
    expect(validateSchema([{ name: "x", showIf: {} }]).ok).toBe(false)
    expect(validateSchema([{ name: "x", showIf: { field: "y" } }]).ok).toBe(false)
    expect(validateSchema([{ name: "x", showIf: { field: "y", equals: 1, all: [] } }]).ok).toBe(false)
    expect(
      validateSchema([{ name: "x", showIf: { all: [{ field: "y" }] } }]).ok,
    ).toBe(false)
  })

  it("allows single conditions combined with groups via AND", () => {
    expect(
      validateSchema([{ name: "x", showIf: { field: "y", equals: 1, all: [{ field: "z", equals: 2 }] } }]).ok,
    ).toBe(true)
  })

  it("accepts single, all and any showIf shapes", () => {
    expect(validateSchema([{ name: "x", showIf: { field: "y", equals: "1" } }]).ok).toBe(true)
    expect(
      validateSchema([{ name: "x", showIf: { all: [{ field: "y", equals: "1" }, { field: "z", notEquals: "2" }] } }]).ok,
    ).toBe(true)
    expect(
      validateSchema([{ name: "x", showIf: { any: [{ field: "y", equals: "1" }] } }]).ok,
    ).toBe(true)
  })

  it("accepts a full valid schema and returns the fields", () => {
    const schema = [
      { name: "email", type: "email", required: true, placeholder: "you@co.com" },
      { name: "role", type: "select", options: ["User", "Admin"] },
      { name: "company", type: "text", showIf: { field: "role", equals: "Admin" } },
    ]
    const r = validateSchema(schema)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.fields).toHaveLength(3)
  })

  it("reports the field index in errors", () => {
    const r = validateSchema([{ name: "ok" }, { name: "" }])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain("Field 2")
  })
})

describe("parseDocumentImport", () => {
  it("accepts a bare field array as fields-only import", () => {
    const r = parseDocumentImport([{ name: "email", type: "email" }])
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc.fields).toHaveLength(1)
      expect(r.doc.variant).toBe("classic")
      expect(r.doc.endpoint).toBeUndefined()
    }
  })

  it("accepts a full document with theme, variant, and endpoint", () => {
    const r = parseDocumentImport({
      version: 1,
      name: "Signup",
      fields: [{ name: "email", type: "email" }],
      theme: { accentColor: "#4f46e5" },
      variant: "conversational",
      endpoint: "https://example.com/hook",
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc.title).toBe("Signup")
      expect(r.doc.theme).toEqual({ accentColor: "#4f46e5" })
      expect(r.doc.variant).toBe("conversational")
      expect(r.doc.endpoint).toBe("https://example.com/hook")
    }
  })

  it("rejects invalid documents without applying anything", () => {
    expect(parseDocumentImport({ fields: [{ name: "" }] }).ok).toBe(false)
    expect(parseDocumentImport({ fields: [{ name: "a" }], variant: "nope" }).ok).toBe(false)
    expect(parseDocumentImport({ fields: [{ name: "a" }], endpoint: "javascript:alert(1)" }).ok).toBe(false)
    expect(parseDocumentImport("nope").ok).toBe(false)
    expect(parseDocumentImport(null).ok).toBe(false)
  })
})
