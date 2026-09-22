import { describe, it, expect, vi } from "vitest"
import { z } from "zod"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { validateFields, validateDocument } from "../src/schema/validate"
import { constraintError } from "../src/core/useKiForm"
import { KiForm } from "../src/renderer/KiForm"
import { buildZodSchema } from "../src/ki-forms-zod"
import { buildZodSource, toReactSnippet } from "../studio/lib/export"
import { parseDocumentImport } from "../studio/lib/schema"
import { Inspector } from "../studio/components/Inspector"
import type { Field } from "../src/types"

/** Evaluate generated Zod source against the real zod instance. */
function evalSource(source: string) {
  const factory = new Function("z", `"use strict"; return (${source});`) as (zod: unknown) => {
    safeParse: (values: unknown) => { success: boolean }
  }
  return factory(z)
}

describe("field constraints (2.4.0)", () => {
  it("validator accepts well-formed constraints", () => {
    expect(
      validateFields([
        { name: "pw", type: "password", minLength: 8, maxLength: 64 },
        { name: "code", pattern: "^[A-Z]{3}$" },
        { name: "age", type: "number", min: 18, max: 120 },
      ]).success,
    ).toBe(true)
  })

  it("validator rejects malformed constraints with paths", () => {
    const cases: { field: Record<string, unknown>; path: string }[] = [
      { field: { name: "a", minLength: -1 }, path: "fields[0].minLength" },
      { field: { name: "a", minLength: 1.5 }, path: "fields[0].minLength" },
      { field: { name: "a", maxLength: -2 }, path: "fields[0].maxLength" },
      { field: { name: "a", minLength: 5, maxLength: 3 }, path: "fields[0].maxLength" },
      { field: { name: "a", pattern: "(unclosed" }, path: "fields[0].pattern" },
      { field: { name: "a", pattern: 42 }, path: "fields[0].pattern" },
      { field: { name: "a", min: "x" }, path: "fields[0].min" },
      { field: { name: "a", max: Number.NaN }, path: "fields[0].max" },
      { field: { name: "a", type: "number", min: 10, max: 5 }, path: "fields[0].max" },
    ]
    for (const { field, path } of cases) {
      const result = validateFields([field])
      expect(result.success, JSON.stringify(field)).toBe(false)
      if (!result.success) expect(result.issues[0].path).toBe(path)
    }
  })

  it("constraintError mirrors the runtime messages", () => {
    expect(constraintError({ name: "pw", minLength: 8 }, "short")).toBe("pw must be at least 8 characters")
    expect(constraintError({ name: "pw", maxLength: 3 }, "toolong")).toBe("pw must be at most 3 characters")
    expect(constraintError({ name: "code", pattern: "^[A-Z]+$" }, "abc")).toBe("code format is invalid")
    expect(constraintError({ name: "age", type: "number", min: 18 }, 12)).toBe("age must be at least 18")
    expect(constraintError({ name: "age", type: "number", max: 99 }, 101)).toBe("age must be at most 99")
    // Empty values are skipped — required owns emptiness.
    expect(constraintError({ name: "pw", minLength: 8 }, "")).toBeUndefined()
    expect(constraintError({ name: "age", type: "number", min: 18 }, "")).toBeUndefined()
    expect(constraintError({ name: "nick", minLength: 2 }, "ok")).toBeUndefined()
    expect(constraintError({ name: "nick", label: "Nickname", minLength: 2 }, "x")).toBe("Nickname must be at least 2 characters")
  })

  it("runtime blocks submit on constraint violations and focuses the field", async () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[{ name: "password", type: "password", label: "Password", required: true, minLength: 8 }]}
        onSubmit={onSubmit}
      />,
    )
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Password must be at least 8 characters")).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Password")))
  })

  it("runtime skips constraints for hidden conditional fields", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[
          { name: "role", options: ["User", "Admin"] },
          { name: "company", showIf: { field: "role", equals: "Admin" }, required: true, minLength: 5 },
        ]}
        onSubmit={onSubmit}
      />,
    )
    // company hidden (no role picked) → submit passes despite minLength.
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("number range blocks submit with the built-in message", () => {
    const onSubmit = vi.fn()
    render(<KiForm fields={[{ name: "age", type: "number", label: "Age", min: 18, max: 120 }]} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "12" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Age must be at least 18")).toBeTruthy()
  })

  it("zod adapter enforces the same constraints (success parity with runtime)", () => {
    const fields: Field[] = [
      { name: "pw", type: "password", minLength: 8, maxLength: 12 },
      { name: "code", pattern: "^[A-Z]{3}$" },
      { name: "age", type: "number", min: 18, max: 120 },
      { name: "nick", type: "text", maxLength: 5 },
    ]
    const schema = buildZodSchema(fields, { zod: z }) as unknown as {
      safeParse: (v: unknown) => { success: boolean }
    }
    const good = { pw: "longenough", code: "ABC", age: 30, nick: "" }
    const bad: Record<string, unknown>[] = [
      { ...good, pw: "short" },
      { ...good, pw: "waytoolongpassword" },
      { ...good, code: "abc" },
      { ...good, age: 12 },
      { ...good, age: 200 },
      { ...good, nick: "toolong" },
    ]
    expect(schema.safeParse(good).success).toBe(true)
    for (const values of bad) expect(schema.safeParse(values).success, JSON.stringify(values)).toBe(false)
    // Optional empty values pass (required owns emptiness). Note: for number
    // fields the empty value is `undefined`/missing — `z.number()` itself
    // rejects `""`, matching pre-existing adapter behavior.
    expect(schema.safeParse({ pw: "longenough", code: "", age: undefined, nick: "" }).success).toBe(true)
  })

  it("generated zod source matches the adapter on constraints", () => {
    const fields: Field[] = [
      { name: "pw", type: "password", minLength: 8 },
      { name: "code", pattern: "^[A-Z]{3}$" },
      { name: "age", type: "number", min: 18, max: 99 },
    ]
    const source = buildZodSource(fields)
    expect(source).toContain("must be at least 8 characters")
    expect(source).toContain("format is invalid")
    expect(source).toContain("must be at most 99")
    const live = evalSource(source)
    const runtime = buildZodSchema(fields, { zod: z }) as unknown as {
      safeParse: (v: unknown) => { success: boolean }
    }
    const cases: Record<string, unknown>[] = [
      { pw: "longenough", code: "ABC", age: 30 },
      { pw: "short", code: "ABC", age: 30 },
      { pw: "longenough", code: "abc", age: 30 },
      { pw: "longenough", code: "ABC", age: 12 },
      { pw: "longenough", code: "", age: "" },
    ]
    for (const values of cases) {
      expect(live.safeParse(values).success, `source disagrees on ${JSON.stringify(values)}`).toBe(
        runtime.safeParse(values).success,
      )
    }
  })

  it("react export emits constraint props and imports them back", () => {
    const fields: Field[] = [{ name: "pw", type: "password", minLength: 8, pattern: "^\\w+$" }]
    const snippet = toReactSnippet("F", fields, { language: "tsx" })
    expect(snippet).toContain("minLength: 8")
    expect(snippet).toContain('pattern: "^\\\\w+$"')
    const doc = parseDocumentImport(JSON.parse(JSON.stringify(fields)))
    expect(doc.ok).toBe(true)
    if (doc.ok) expect(doc.doc.fields).toEqual(fields)
  })

  it("document import preserves constraints and rejects bad ranges", () => {
    const ok = parseDocumentImport({ version: 1, fields: [{ name: "a", minLength: 2 }] })
    expect(ok.ok).toBe(true)
    const bad = validateDocument({ version: 1, fields: [{ name: "a", minLength: 5, maxLength: 2 }] })
    expect(bad.success).toBe(false)
  })

  it("inspector edits min length for text fields", () => {
    const onChange = vi.fn()
    render(
      <Inspector
        field={{ name: "pw", type: "password" }}
        otherFields={[]}
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText("Min length") as HTMLInputElement
    fireEvent.change(input, { target: { value: "8" } })
    expect(onChange).toHaveBeenCalledWith({ minLength: 8 })
  })

  it("inspector edits min value for number fields and hides text options", () => {
    const onChange = vi.fn()
    render(
      <Inspector
        field={{ name: "age", type: "number" }}
        otherFields={[]}
        onChange={onChange}
      />,
    )
    expect(screen.queryByLabelText("Min length")).toBeNull()
    fireEvent.change(screen.getByLabelText("Min value"), { target: { value: "18" } })
    expect(onChange).toHaveBeenCalledWith({ min: 18 })
  })

  it("inspector warns on invalid regex", () => {
    render(
      <Inspector
        field={{ name: "code", type: "text", pattern: "(oops" }}
        otherFields={[]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/Invalid regular expression/)).toBeTruthy()
  })
})
