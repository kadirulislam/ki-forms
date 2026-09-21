import { describe, it, expect } from "vitest"
import { z } from "zod"
import { buildZodSource, exportReact } from "../studio/lib/export"
import { buildZodSchema } from "../src/ki-forms-zod"
import type { Field } from "../src/types"

type LiveSchema = { safeParse: (values: unknown) => { success: boolean; error?: unknown } }

/** Evaluate generated source against the real zod instance. */
function evalSource(source: string): LiveSchema {
  const factory = new Function("z", `"use strict"; return (${source});`) as (zod: unknown) => LiveSchema
  return factory(z)
}

const FIELDS: Field[] = [
  { name: "email", type: "email", required: true },
  { name: "nickname", type: "text" },
  { name: "age", type: "number", required: true },
  { name: "terms", type: "checkbox", required: true },
  { name: "role", type: "select", options: ["User", "Admin"] },
  { name: "company", showIf: { field: "role", equals: "Admin" }, required: true },
]

describe("buildZodSource", () => {
  it("emits required, optional, email, number, and checkbox shapes", () => {
    const source = buildZodSource(FIELDS)
    expect(source).toContain('email: z.string().email("Enter a valid email").min(1, "email is required")')
    expect(source).toContain("nickname: z.string().optional()")
    expect(source).toContain("age: z.number()")
    expect(source).toContain('terms: z.boolean().refine((v) => v === true, { message: "terms must be checked" })')
    expect(source).toContain("company: z.string().optional()")
  })

  it("derives conditional requiredness from showIf via superRefine", () => {
    const source = buildZodSource(FIELDS)
    expect(source).toContain(".superRefine((values, ctx) => {")
    expect(source).toContain('values.role === "Admin"')
    expect(source).toContain('path: ["company"]')
  })

  it("keeps string shorthand instead of dropping it", () => {
    const source = buildZodSource(["email"] as unknown as Field[])
    expect(source).toContain("email: z.string().optional()")
  })

  it("emits group conditions with && / ||", () => {
    const source = buildZodSource([
      { name: "taxId", required: true, showIf: { all: [{ field: "a", equals: 1 }, { field: "b", notEquals: 2 }] } },
      { name: "promo", required: true, showIf: { any: [{ field: "c", equals: "x" }] } },
    ])
    expect(source).toContain('values.a === 1 && values.b !== 2')
    expect(source).toContain('values.c === "x"')
  })

  it("uses custom labels in messages", () => {
    const source = buildZodSource([{ name: "email", type: "email", label: "Work email", required: true }])
    expect(source).toContain('"Work email is required"')
  })

  it("is deterministic", () => {
    expect(buildZodSource(FIELDS)).toBe(buildZodSource(FIELDS))
  })

  it("matches buildZodSchema behavior across visible/hidden/filled cases", () => {
    const live = evalSource(buildZodSource(FIELDS))
    const runtime = buildZodSchema(FIELDS, { zod: z }) as unknown as LiveSchema
    const cases: Record<string, unknown>[] = [
      { email: "a@b.co", age: 30, terms: true, role: "User", company: "" },
      { email: "a@b.co", age: 30, terms: true, role: "Admin", company: "" },
      { email: "a@b.co", age: 30, terms: true, role: "Admin", company: "Acme" },
      { email: "", age: 30, terms: true, role: "User", company: "" },
      { email: "a@b.co", age: Number.NaN, terms: true, role: "User", company: "" },
      { email: "a@b.co", age: 30, terms: false, role: "User", company: "" },
      { email: "not-an-email", age: 30, terms: true, role: "User", company: "" },
    ]
    for (const values of cases) {
      expect(
        live.safeParse(values).success,
        `generated source disagrees on ${JSON.stringify(values)}`,
      ).toBe(runtime.safeParse(values).success)
    }
  })
})

describe("exportReact with validation: zod", () => {
  it("emits zod import, schema const, schema prop, and z.infer type", () => {
    const { code, warnings } = exportReact("SignupForm", FIELDS, { language: "tsx", validation: "zod" })
    expect(warnings).toEqual([])
    expect(code).toContain('import { z } from "zod"')
    expect(code).toContain("const schema = z.object({")
    expect(code).toContain("type FormValues = z.infer<typeof schema>")
    expect(code).toContain("schema={schema}")
    expect(code).not.toContain("InferFormValues")
    expect(code).toContain("onSubmit={(values: FormValues) => {")
  })

  it("works without tsx (no type annotation)", () => {
    const { code } = exportReact("SignupForm", FIELDS, { validation: "zod" })
    expect(code).toContain('import { z } from "zod"')
    expect(code).toContain("schema={schema}")
    expect(code).not.toContain("z.infer")
    expect(code).toContain("onSubmit={(values) => {")
  })

  it("stays deterministic", () => {
    const options = { language: "tsx", validation: "zod" } as const
    expect(exportReact("A", FIELDS, options).code).toBe(exportReact("A", FIELDS, options).code)
  })

  it("generated component schema validates like the runtime", () => {
    const { code } = exportReact("SignupForm", FIELDS, { language: "tsx", validation: "zod" })
    const match = code.match(/const schema = (z\.object\([\s\S]*?)\n\ntype FormValues/)
    expect(match).toBeTruthy()
    const live = evalSource(match![1])
    expect(live.safeParse({ email: "a@b.co", age: 30, terms: true, role: "Admin", company: "" }).success).toBe(false)
    expect(live.safeParse({ email: "a@b.co", age: 30, terms: true, role: "Admin", company: "Acme" }).success).toBe(true)
  })
})
