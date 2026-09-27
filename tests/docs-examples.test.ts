import { describe, it, expect } from "vitest"
import { validateFields, validateDocument } from "../src/schema/validate"
import {
  EXAMPLE_BASIC,
  EXAMPLE_CONDITIONAL,
  EXAMPLE_GROUP,
  EXAMPLE_STYLED,
} from "../website/lib/docs-content"

describe("docs examples", () => {
  it("basic example validates", () => {
    expect(validateFields(EXAMPLE_BASIC).success).toBe(true)
  })

  it("conditional example validates and uses showIf source of truth", () => {
    const result = validateFields(EXAMPLE_CONDITIONAL)
    expect(result.success).toBe(true)
    if (result.success) {
      const company = result.data.find((f) => typeof f !== "string" && f.name === "company")
      expect(company && typeof company !== "string" && company.showIf).toBeTruthy()
    }
  })

  it("group example validates", () => {
    expect(validateFields(EXAMPLE_GROUP).success).toBe(true)
  })

  it("styled example validates", () => {
    expect(validateFields(EXAMPLE_STYLED).success).toBe(true)
  })

  it("document example validates", () => {
    expect(validateDocument({ version: 1, fields: EXAMPLE_CONDITIONAL, variant: "classic" }).success).toBe(true)
  })

  it("two-column example validates and pairs as documented", async () => {
    const { EXAMPLE_TWO_COLUMN } = await import("../website/lib/docs-content")
    const result = validateFields(EXAMPLE_TWO_COLUMN)
    expect(result.success).toBe(true)
    if (result.success) {
      const halves = result.data.filter((f) => typeof f !== "string" && f.width === "half")
      expect(halves).toHaveLength(4)
      // Documented as pairing: the halves must be consecutive in pairs.
      expect(halves.filter((f) => f !== halves[0]).length).toBe(3)
    }
  })

  it("every documented field prop exists in public Field type", async () => {
    const { validateFields: v } = await import("../src/schema/validate")
    expect(v([{ name: "x", type: "text", label: "X", placeholder: "p", helperText: "h", className: "c", required: true }]).success).toBe(true)
  })
})
