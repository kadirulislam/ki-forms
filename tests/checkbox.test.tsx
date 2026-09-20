/**
 * CheckboxField — new in 2.1.0 ("checkbox" was declared in 2.0.0 types but no
 * component was registered; the compat suite pins that historical gap, this
 * file pins the new behavior).
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { KiForm } from "../src"

describe("checkbox field (new in 2.1.0)", () => {
  it("renders, toggles, and submits a boolean", () => {
    const onSubmit = vi.fn()
    const { container } = render(
      <KiForm fields={[{ name: "terms", type: "checkbox", label: "I agree" }]} onSubmit={onSubmit} />
    )

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    expect(checkbox).toBeTruthy()
    expect(checkbox.checked).toBe(false)

    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)

    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledWith({ terms: true })
  })

  it("respects helperText and custom className", () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "newsletter", type: "checkbox", helperText: "No spam", className: "opt-in" },
        ]}
      />
    )
    expect(screen.getByText("No spam")).toBeTruthy()
    expect(
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.className
    ).toContain("opt-in")
  })
})
