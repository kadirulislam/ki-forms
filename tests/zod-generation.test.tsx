/**
 * ki-forms/zod — new in 2.1.0. Generates a Zod schema from field config using
 * the user's own zod instance.
 */
import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { render, screen, fireEvent } from "@testing-library/react"
import { buildZodSchema } from "../src/ki-forms-zod"
import { KiForm } from "../src"
import type { Field } from "../src"

describe("buildZodSchema (new in 2.1.0)", () => {
  it("required string fields are non-empty with built-in messages", () => {
    const fields: Field[] = [{ name: "email", required: true }]
    const schema = buildZodSchema(fields, { zod: z }) as any

    const bad = schema.safeParse({ email: "" })
    expect(bad.success).toBe(false)
    expect(bad.error.issues[0].message).toBe("email is required")

    expect(schema.safeParse({ email: "ok" }).success).toBe(true)
  })

  it("optional fields pass through empty", () => {
    const fields: Field[] = [{ name: "nickname" }]
    const schema = buildZodSchema(fields, { zod: z }) as any
    expect(schema.safeParse({ nickname: "" }).success).toBe(true)
    expect(schema.safeParse({}).success).toBe(true)
  })

  it("email type validates format", () => {
    const fields: Field[] = [{ name: "email", type: "email", required: true }]
    const schema = buildZodSchema(fields, { zod: z }) as any

    expect(schema.safeParse({ email: "not-an-email" }).success).toBe(false)
    expect(schema.safeParse({ email: "a@b.co" }).success).toBe(true)
  })

  it("checkbox must be true when required", () => {
    const fields: Field[] = [{ name: "terms", type: "checkbox", required: true }]
    const schema = buildZodSchema(fields, { zod: z }) as any

    expect(schema.safeParse({ terms: false }).success).toBe(false)
    expect(schema.safeParse({ terms: true }).success).toBe(true)
  })

  it("number type produces number validation", () => {
    const fields: Field[] = [{ name: "age", type: "number", required: true }]
    const schema = buildZodSchema(fields, { zod: z }) as any

    expect(schema.safeParse({ age: "abc" }).success).toBe(false)
    expect(schema.safeParse({ age: 42 }).success).toBe(true)
  })

  it("requiredWhen makes a field required exactly when its condition matches", () => {
    const fields: Field[] = [
      { name: "role", options: ["User", "Admin"] },
      { name: "company" },
    ]
    const schema = buildZodSchema(fields, {
      zod: z,
      requiredWhen: { company: { field: "role", equals: "Admin" } },
    }) as any

    // Admin without company -> blocked, with the built-in message
    const bad = schema.safeParse({ role: "Admin", company: "" })
    expect(bad.success).toBe(false)
    expect(bad.error.issues[0].message).toBe("company is required")

    // User without company -> fine
    expect(schema.safeParse({ role: "User", company: "" }).success).toBe(true)

    // Admin with company -> fine
    expect(schema.safeParse({ role: "Admin", company: "Acme" }).success).toBe(true)
  })

  it("integrates with useKiForm via the existing schema option", () => {

    const fields: Field[] = [{ name: "email", type: "email", required: true }]
    const onSubmit = vi.fn()

    render(
      <KiForm
        fields={fields}
        schema={buildZodSchema(fields, { zod: z })}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("Enter your email"), {
      target: { value: "not-an-email" },
    })
    fireEvent.submit(document.querySelector("form")!)

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Enter a valid email")).toBeTruthy()
  })
})
