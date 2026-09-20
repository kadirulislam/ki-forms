/**
 * showIf condition groups — new in 2.1.0.
 * Legacy single-condition semantics are pinned in the compat suite; this file
 * covers the additive all/any groups.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { KiForm } from "../src"

describe("showIf condition groups (new in 2.1.0)", () => {
  it("all: shows the field only when every condition matches", () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "country", options: ["US", "CA"] },
          { name: "plan", options: ["Free", "Pro"] },
          {
            name: "taxId",
            showIf: {
              all: [
                { field: "country", equals: "US" },
                { field: "plan", equals: "Pro" },
              ],
            },
          },
        ]}
      />
    )

    const country = container.querySelectorAll("select")[0]
    const plan = container.querySelectorAll("select")[1]

    expect(screen.queryByPlaceholderText("Enter your tax id")).toBeNull()

    fireEvent.change(country, { target: { value: "US" } })
    expect(screen.queryByPlaceholderText("Enter your tax id")).toBeNull() // plan still Free

    fireEvent.change(plan, { target: { value: "Pro" } })
    expect(screen.getByPlaceholderText("Enter your tax id")).toBeTruthy()

    fireEvent.change(plan, { target: { value: "Free" } })
    expect(screen.queryByPlaceholderText("showIf" in {} ? "" : "Enter your tax id")).toBeNull()
  })

  it("any: shows the field when at least one condition matches", () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "a", options: ["x", "y"] },
          { name: "b", options: ["p", "q"] },
          {
            name: "extra",
            showIf: {
              any: [
                { field: "a", equals: "x" },
                { field: "b", equals: "p" },
              ],
            },
          },
        ]}
      />
    )

    const a = container.querySelectorAll("select")[0]
    const b = container.querySelectorAll("select")[1]

    expect(screen.queryByPlaceholderText("Enter your extra")).toBeNull()

    fireEvent.change(a, { target: { value: "x" } })
    expect(screen.getByPlaceholderText("Enter your extra")).toBeTruthy()

    fireEvent.change(a, { target: { value: "y" } })
    expect(screen.queryByPlaceholderText("Enter your extra")).toBeNull()

    fireEvent.change(b, { target: { value: "p" } })
    expect(screen.getByPlaceholderText("Enter your extra")).toBeTruthy()
  })

  it("groups combine with a top-level condition via AND", () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "country", options: ["US", "CA"] },
          { name: "plan", options: ["Free", "Pro"] },
          {
            name: "ein",
            showIf: {
              field: "country",
              equals: "US",
              any: [{ field: "plan", equals: "Pro" }],
            },
          },
        ]}
      />
    )

    const country = container.querySelectorAll("select")[0]
    const plan = container.querySelectorAll("select")[1]

    fireEvent.change(country, { target: { value: "US" } })
    fireEvent.change(plan, { target: { value: "Pro" } })
    expect(screen.getByPlaceholderText("Enter your ein")).toBeTruthy()

    fireEvent.change(plan, { target: { value: "Free" } })
    expect(screen.queryByPlaceholderText("Enter your ein")).toBeNull()
  })

  it("hidden grouped fields skip required validation", () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <KiForm
        fields={[
          { name: "country", options: ["US", "CA"] },
          { name: "plan", options: ["Free", "Pro"] },
          {
            name: "taxId",
            required: true,
            showIf: {
              all: [
                { field: "country", equals: "US" },
                { field: "plan", equals: "Pro" },
              ],
            },
          },
        ]}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ country: "", plan: "", taxId: "" })

    const country = container.querySelectorAll("select")[0]
    const plan = container.querySelectorAll("select")[1]
    fireEvent.change(country, { target: { value: "US" } })
    fireEvent.change(plan, { target: { value: "Pro" } })
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledTimes(1) // blocked: taxId now visible+required
    expect(screen.getByText("Tax Id is required")).toBeTruthy()
  })
})
