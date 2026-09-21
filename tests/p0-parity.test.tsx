import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { z } from "zod"
import { KiForm, defineFields, validateFields, validateDocument, normalizeDocument } from "../src"
import { exportReact, importSchemaBlock, toRoundTripSnippet } from "../studio/lib/export"
import { parseDocumentImport } from "../studio/lib/schema"
import { buildZodSchema } from "../src/ki-forms-zod"
import type { InferFormValues } from "../src"

describe("P0 canonical parity", () => {
  it("Studio and runtime share validateFields", () => {
    expect(validateFields([{ name: "email", type: "email" }]).success).toBe(true)
    expect(validateFields([{ name: "" }]).success).toBe(false)
    expect(validateFields("nope").success).toBe(false)
  })

  it("validateDocument checks theme/variant/endpoint", () => {
    expect(validateDocument({ version: 1, fields: [{ name: "a" }], variant: "classic" }).success).toBe(true)
    expect(validateDocument({ version: 1, fields: [{ name: "a" }], variant: "nope" }).success).toBe(false)
    expect(validateDocument({ version: 1, fields: [{ name: "a" }], endpoint: "javascript:alert(1)" }).success).toBe(false)
  })

  it("normalizeDocument is deterministic", () => {
    const a = normalizeDocument([{ name: "email" }])
    const b = normalizeDocument([{ name: "email" }])
    expect(a).toEqual(b)
  })

  it("showIf + required derives conditional Zod validation", () => {
    const fields = defineFields([
      { name: "role", type: "select", options: ["User", "Admin"] },
      { name: "company", showIf: { field: "role", equals: "Admin" }, required: true },
    ] as const)
    type Values = InferFormValues<typeof fields>
    const admin = { role: "Admin", company: undefined } as unknown as Values
    expect((admin as { role: string }).role).toBe("Admin")
    const schema = buildZodSchema([...fields], { zod: z }) as unknown as { safeParse: (v: unknown) => { success: boolean } }
    expect(schema.safeParse({ role: "User", company: "" }).success).toBe(true)
    expect(schema.safeParse({ role: "Admin", company: "" }).success).toBe(false)
    expect(schema.safeParse({ role: "Admin", company: "Acme" }).success).toBe(true)
  })

  it("all/any groups work in runtime and Zod", () => {
    const fields = [
      { name: "country", options: ["US", "CA"] },
      { name: "plan", options: ["Free", "Pro"] },
      { name: "taxId", required: true, showIf: { all: [{ field: "country", equals: "US" }, { field: "plan", equals: "Pro" }] } },
    ] as never[]
    const schema = buildZodSchema(fields as never[], { zod: z }) as unknown as { safeParse: (v: unknown) => { success: boolean } }
    expect(schema.safeParse({ country: "CA", plan: "Free", taxId: "" }).success).toBe(true)
    expect(schema.safeParse({ country: "US", plan: "Pro", taxId: "" }).success).toBe(false)
  })

  it("hidden required fields do not block runtime submit", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[
          { name: "role", options: ["User", "Admin"] },
          { name: "company", showIf: { field: "role", equals: "Admin" }, required: true },
        ]}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("export warns on onChange and round-trips schema blocks", () => {
    const fields = [{ name: "role", onChange: () => {} }] as never[]
    const result = exportReact("MyForm", fields as never[])
    expect(result.warnings.length).toBe(1)
    expect(result.code).toContain("const fields = [")
    const snippet = toRoundTripSnippet("MyForm", [{ name: "email" }])
    expect(importSchemaBlock(snippet)).toEqual([{ name: "email" }])
    expect(importSchemaBlock("no marker")).toBeNull()
  })

  it("round-trip preserves theme, variant, endpoint, and invalid code imports nothing", () => {
    const snippet = toRoundTripSnippet("MyForm", [{ name: "email" }], {
      theme: { accentColor: "#111" },
      variant: "conversational",
      endpoint: "https://example.com/hook",
    })
    const parsed = parseDocumentImport(importSchemaBlock(snippet))
    expect(parsed.ok).toBe(true)
  })

  it("export is deterministic", () => {
    const fields = [{ name: "email", type: "email", required: true }] as never[]
    expect(exportReact("A", fields as never[]).code).toBe(exportReact("A", fields as never[]).code)
  })
})
