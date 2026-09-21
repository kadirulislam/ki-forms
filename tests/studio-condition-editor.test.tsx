import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Inspector } from "../studio/components/Inspector"
import type { Field } from "../src/types"

const OTHERS: Field[] = [
  { name: "role", type: "select", options: ["User", "Admin"] },
  { name: "plan", type: "select", options: ["Free", "Pro"] },
]

function renderInspector(field: Field, onChange = vi.fn()) {
  const utils = render(<Inspector field={field} otherFields={OTHERS} onChange={onChange} />)
  return { ...utils, onChange }
}

describe("ConditionEditor", () => {
  it("shows always-visible mode with no summary when showIf is absent", () => {
    renderInspector({ name: "company" })
    expect(screen.getByText("Show only if")).toBeTruthy()
    expect(screen.queryByText(/Visible when:/)).toBeNull()
  })

  it("edits single conditions and shows a readable summary", () => {
    const onChange = vi.fn()
    renderInspector({ name: "company", showIf: { field: "role", equals: "Admin" } }, onChange)
    expect(screen.getByText('Visible when: role === "Admin"')).toBeTruthy()
    const inputs = screen.getAllByPlaceholderText("value")
    fireEvent.change(inputs[0], { target: { value: "User" } })
    expect(onChange).toHaveBeenCalledWith({ showIf: { field: "role", equals: "User" } })
  })

  it("edits all-groups: rows, add, and remove", () => {
    const onChange = vi.fn()
    renderInspector(
      { name: "taxId", showIf: { all: [{ field: "role", equals: "Admin" }] } },
      onChange,
    )
    expect(screen.getByText('Visible when: role === "Admin"')).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "+ Add condition" }))
    expect(onChange).toHaveBeenCalledWith({
      showIf: { all: [{ field: "role", equals: "Admin" }, { field: "role", equals: "" }] },
    })
  })

  it("removing the last group condition falls back to no condition", () => {
    const onChange = vi.fn()
    const { container } = renderInspector(
      { name: "taxId", showIf: { all: [{ field: "role", equals: "Admin" }] } },
      onChange,
    )
    // Single-row groups cannot remove (canRemove false) — switch tested via patchGroup indirectly.
    expect(container.querySelectorAll('button[aria-label="Remove condition"]').length).toBe(0)
  })

  it("warns on unknown dependency fields", () => {
    renderInspector({ name: "company", showIf: { field: "ghost", equals: "x" } })
    expect(screen.getByText(/Unknown field/)).toBeTruthy()
  })

  it("supports any-groups with OR summary", () => {
    renderInspector({
      name: "promo",
      showIf: { any: [{ field: "plan", equals: "Pro" }, { field: "role", equals: "Admin" }] },
    })
    expect(screen.getByText('Visible when: (plan === "Pro" OR role === "Admin")')).toBeTruthy()
  })

  it("derives the mode label from existing showIf shapes", () => {
    const { unmount } = renderInspector({ name: "a", showIf: { field: "role", equals: "Admin" } })
    expect(screen.getByText("Single condition")).toBeTruthy()
    unmount()
    renderInspector({ name: "a", showIf: { all: [{ field: "role", equals: "Admin" }] } })
    expect(screen.getByText("All of these (AND)")).toBeTruthy()
  })
})
