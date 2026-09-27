import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { KiForm, groupIntoRows } from "../src/index"
import { validateFields } from "../src/schema/validate"
import { exportReact, importSchemaBlock, toRoundTripSnippet } from "../src/codegen/react"
import type { Field } from "../src/types"

/**
 * Two-column layout via `width: "half"` (2.5.0).
 *
 * The property is additive and defaults to "full", so every schema that does
 * not mention it must keep rendering exactly as before. Most of these tests
 * guard that default rather than the new feature.
 */

const f = (name: string, extra: Partial<Field> = {}): Field => ({ name, ...extra })

describe("width validation", () => {
  it("accepts half and full", () => {
    expect(validateFields([f("a", { width: "half" }), f("b", { width: "full" })]).success).toBe(true)
  })

  it("treats an absent width as valid", () => {
    expect(validateFields([f("a"), f("b", { width: undefined })]).success).toBe(true)
  })

  it("rejects any other value with a path-specific issue", () => {
    const result = validateFields([f("a", { width: "third" as never })])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues[0].path).toBe("fields[0].width")
      expect(result.issues[0].message).toContain('"half" or "full"')
    }
  })
})

describe("groupIntoRows", () => {
  it("keeps every field on its own row when no width is set", () => {
    const items = groupIntoRows([f("a"), f("b"), f("c")])
    expect(items).toHaveLength(3)
    expect(items.every((i) => i.kind === "single")).toBe(true)
  })

  it("pairs consecutive half fields into one row", () => {
    const items = groupIntoRows([f("firstName", { width: "half" }), f("lastName", { width: "half" })])
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: "row", stretchLast: false })
  })

  it("does not pair a half field across a full-width field", () => {
    const items = groupIntoRows([
      f("firstName", { width: "half" }),
      f("email", { type: "email" }),
      f("phone", { width: "half" }),
    ])
    // The leading half is left dangling, and email breaks the pairing.
    expect(items.map((i) => i.kind)).toEqual(["row", "single", "row"])
    expect(items[2]).toMatchObject({ kind: "row", stretchLast: true })
  })

  it("marks an odd trailing half field as stretching", () => {
    const items = groupIntoRows([
      f("firstName", { width: "half" }),
      f("lastName", { width: "half" }),
      f("phone", { width: "half" }),
    ])
    expect(items).toHaveLength(2)
    expect(items[1]).toMatchObject({ kind: "row", stretchLast: true })
  })
})

describe("two-column rendering", () => {
  it("renders paired halves inside a single row container", () => {
    const { container } = render(
      <KiForm fields={[f("firstName", { width: "half" }), f("lastName", { width: "half" })]} />,
    )
    const rows = container.querySelectorAll(".ki-row")
    expect(rows).toHaveLength(1)
    expect(rows[0].querySelectorAll(".ki-form-item")).toHaveLength(2)
  })

  it("does not create row containers for a full-width form", () => {
    const { container } = render(<KiForm fields={[f("a"), f("b")]} />)
    expect(container.querySelectorAll(".ki-row")).toHaveLength(0)
  })

  it("marks a lone trailing half field so it spans the row", () => {
    const { container } = render(
      <KiForm fields={[f("firstName", { width: "half" }), f("lastName", { width: "half" }), f("phone", { width: "half" })]} />,
    )
    const rows = container.querySelectorAll(".ki-row")
    expect(rows).toHaveLength(2)
    expect(rows[0].hasAttribute("data-stretch-last")).toBe(false)
    expect(rows[1].getAttribute("data-stretch-last")).toBe("true")
  })

  it("keeps a hidden half field from breaking its row", () => {
    // A conditional partner that is hidden must not leave a visible gap or
    // change how its sibling is laid out.
    const { container } = render(
      <KiForm
        fields={[
          f("role", { type: "select", options: ["User", "Admin"] }),
          f("company", { width: "half", showIf: { field: "role", equals: "Admin" } }),
        ]}
      />,
    )
    // company is hidden, so the row container renders with no visible children.
    expect(container.querySelectorAll(".ki-form-item")).toHaveLength(1)
  })

  it("submits values for both halves of a row", async () => {
    const { container } = render(
      <KiForm
        fields={[f("firstName", { width: "half" }), f("lastName", { width: "half" })]}
        onSubmit={() => {}}
      />,
    )
    const inputs = container.querySelectorAll("input")
    expect(inputs).toHaveLength(2)
    expect(screen.getByLabelText(/first name/i)).toBeTruthy()
    expect(screen.getByLabelText(/last name/i)).toBeTruthy()
  })
})

describe("width export", () => {
  it("emits width on a half field", () => {
    const code = exportReact("F", [f("firstName", { width: "half" })]).code
    expect(code).toContain('width: "half"')
  })

  it("never collapses a half-width bare text field to the string shorthand", () => {
    // Without this guard the shorthand would silently drop the width.
    const code = exportReact("F", [f("nickname", { type: "text", width: "half" })]).code
    // The field must be emitted as an object literal, not a bare string.
    expect(code).toContain('{ name: "nickname", type: "text", width: "half" }')
    expect(code).not.toMatch(/^\s*"nickname",$/m)
  })

  it("sizes inputs with border-box so paired halves do not touch", async () => {
    // Regression: `width: 100%` resolved against the content box, so padding
    // and border pushed each field past its grid column and the two halves of a
    // row visually collided. Caught by measuring the built CSS in a browser,
    // not by jsdom, which has no layout.
    const { readFileSync } = await import("node:fs")
    const { resolve } = await import("node:path")
    const css = readFileSync(resolve(process.cwd(), "src/styles/index.css"), "utf8")
    // The rule is a comma group, so box-sizing appears once for both selectors.
    expect(css).toMatch(/\.ki-input,\s*\.ki-select\s*\{[^}]*box-sizing:\s*border-box/)
  })

  it("still uses the shorthand for an ordinary bare text field", () => {
    const code = exportReact("F", [f("nickname", { type: "text" })]).code
    expect(code).toMatch(/^\s*"nickname",$/m)
  })

  it("round-trips width through the hidden schema block", () => {
    const fields = [f("firstName", { width: "half" }), f("lastName", { width: "half" })]
    const code = toRoundTripSnippet("F", fields)
    const reimported = importSchemaBlock(code)
    expect(reimported).not.toBeNull()
    expect((reimported![0] as Field).width).toBe("half")
    expect((reimported![1] as Field).width).toBe("half")
  })
})
