/**
 * variant="conversational" — new in 2.1.0. One field per step, progress,
 * Back/Next, Enter-to-advance, error jump-back.
 */
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { KiForm } from "../src"

const fields = [
  { name: "firstName", required: true },
  { name: "email", type: "email" as const },
  { name: "role", options: ["User", "Admin"] },
  { name: "bio", type: "textarea" as const },
]

describe("conversational variant (new in 2.1.0)", () => {
  it("shows one field at a time and advances forward", () => {
    render(<KiForm fields={fields} variant="conversational" onSubmit={vi.fn()} />)

    expect(screen.getByPlaceholderText("Enter your first name")).toBeTruthy()
    expect(screen.queryByPlaceholderText("Enter your email")).toBeNull()

    fireEvent.change(screen.getByPlaceholderText("Enter your first name"), {
      target: { value: "Ki" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))

    expect(screen.getByPlaceholderText("Enter your email")).toBeTruthy()
    expect(screen.queryByPlaceholderText("Enter your first name")).toBeNull()
  })

  it("Next is blocked while the current field fails validation, then passes", () => {
    render(<KiForm fields={fields} variant="conversational" onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    expect(screen.getByText("First Name is required")).toBeTruthy()
    expect(screen.getByPlaceholderText("Enter your first name")).toBeTruthy() // still step 1

    fireEvent.change(screen.getByPlaceholderText("Enter your first name"), {
      target: { value: "Ki" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    expect(screen.getByPlaceholderText("Enter your email")).toBeTruthy()
  })

  it("full walk: fill every step, submit on the last, values intact", () => {
    const onSubmit = vi.fn()
    render(<KiForm fields={fields} variant="conversational" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByPlaceholderText("Enter your first name"), { target: { value: "Ki" } })
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    fireEvent.click(screen.getByRole("button", { name: "Next →" })) // email optional
    fireEvent.click(screen.getByRole("button", { name: "Next →" })) // role optional

    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: "Ki",
      email: "",
      role: "",
      bio: "",
    })
  })

  it("Back returns to the previous step and shows its error state", () => {
    render(<KiForm fields={fields} variant="conversational" onSubmit={vi.fn()} />)

    fireEvent.change(screen.getByPlaceholderText("Enter your first name"), { target: { value: "Ki" } })
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    fireEvent.click(screen.getByRole("button", { name: "← Back" }))

    expect(screen.getByPlaceholderText("Enter your first name")).toBeTruthy()
    expect((screen.getByPlaceholderText("Enter your first name") as HTMLInputElement).value).toBe("Ki")
  })

  it("Enter advances on input steps and submits on a non-textarea last step", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[{ name: "a", required: true }, { name: "b" }]}
        variant="conversational"
        onSubmit={onSubmit}
      />
    )

    // Enter on step 1 advances
    fireEvent.change(screen.getByPlaceholderText("Enter your a"), { target: { value: "x" } })
    fireEvent.keyDown(screen.getByPlaceholderText("Enter your a"), { key: "Enter" })
    expect(screen.getByPlaceholderText("Enter your b")).toBeTruthy()

    // Enter on the (input) last step submits
    fireEvent.keyDown(screen.getByPlaceholderText("Enter your b"), { key: "Enter" })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("Enter inside a textarea inserts a newline instead of submitting", () => {
    const onSubmit = vi.fn()
    render(
      <KiForm
        fields={[{ name: "bio", type: "textarea", required: true }]}
        variant="conversational"
        onSubmit={onSubmit}
      />
    )
    fireEvent.keyDown(screen.getByPlaceholderText("Enter your bio"), { key: "Enter" })
    // no submit, no validation, no step change — newline belongs to the user
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText("Bio is required")).toBeNull()
  })

  it("stepLabels customize the nav buttons", () => {
    render(
      <KiForm
        fields={[{ name: "a", required: true }, { name: "b" }]}
        variant="conversational"
        stepLabels={{ next: "Continue", submit: "Send it" }}
        onSubmit={vi.fn()}
      />
    )
    // two fields: step 1 shows the customized Next
    expect(screen.getByRole("button", { name: "Continue →" })).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText("Enter your a"), { target: { value: "x" } })
    fireEvent.click(screen.getByRole("button", { name: "Continue →" }))
    // last step shows the customized Submit
    expect(screen.getByRole("button", { name: "Send it" })).toBeTruthy()
  })

  it("select steps advance with Next too", () => {
    render(<KiForm fields={fields} variant="conversational" onSubmit={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText("Enter your first name"), { target: { value: "Ki" } })
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    fireEvent.click(screen.getByRole("button", { name: "Next →" }))
    expect(screen.queryAllByRole("combobox").length).toBeGreaterThan(0)
  })

  it("does not affect the classic variant", () => {
    render(<KiForm fields={fields} onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText("Enter your first name")).toBeTruthy()
    expect(screen.getByPlaceholderText("Enter your email")).toBeTruthy() // all visible at once
  })
})
