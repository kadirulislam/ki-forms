import { describe, it, expect, vi } from "vitest"
import { useState } from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import axe from "axe-core"
import { KiForm } from "../src/renderer/KiForm"
import { DocsModal } from "../studio/components/Modals"

/**
 * Accessibility hardening (P2.4.0): axe coverage, focus management,
 * step announcements, error summary, modal focus restoration.
 *
 * color-contrast is excluded: jsdom has no layout/computed styles, so that
 * rule cannot evaluate outside a real browser (covered manually via the
 * high-contrast Studio tokens instead).
 */
async function axeViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { "color-contrast": { enabled: false } },
  })
  return results.violations
}

describe("accessibility", () => {
  it("classic form has no axe violations", async () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "email", type: "email", required: true },
          { name: "password", type: "password", required: true },
        ]}
        onSubmit={vi.fn()}
      />,
    )
    expect(await axeViolations(container)).toEqual([])
  })

  it("conversational form has no axe violations", async () => {
    const { container } = render(
      <KiForm
        fields={[
          { name: "email", type: "email", required: true },
          { name: "name", type: "text", required: true },
        ]}
        variant="conversational"
        onSubmit={vi.fn()}
      />,
    )
    expect(await axeViolations(container)).toEqual([])
  })

  it("failed classic submit focuses the first invalid field", async () => {
    render(
      <KiForm
        fields={[
          { name: "email", type: "email", required: true },
          { name: "password", type: "password", required: true },
        ]}
        onSubmit={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    const email = screen.getByLabelText("Email") as HTMLInputElement
    await waitFor(() => expect(email.getAttribute("aria-invalid")).toBe("true"))
    await waitFor(() => expect(document.activeElement).toBe(email))
  })

  it("shows a linked error summary when two or more fields fail", async () => {
    render(
      <KiForm
        fields={[
          { name: "email", type: "email", required: true },
          { name: "password", type: "password", required: true },
        ]}
        onSubmit={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    const summary = await screen.findByRole("alert")
    expect(summary.textContent).toContain("2 fields need attention")
    const links = summary.querySelectorAll("a")
    expect(links.length).toBe(2)
    for (const link of Array.from(links)) {
      const target = link.getAttribute("href")?.slice(1)
      expect(document.getElementById(target ?? "")).toBeTruthy()
    }
  })

  it("wires checkbox errors to the input for assistive tech", async () => {
    const onSubmit = vi.fn()
    render(<KiForm fields={[{ name: "terms", type: "checkbox", label: "Accept terms", required: true }]} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole("button", { name: "Submit" }))
    expect(onSubmit).not.toHaveBeenCalled()
    const box = screen.getByRole("checkbox", { name: "Accept terms" }) as HTMLInputElement
    await waitFor(() => expect(box.getAttribute("aria-invalid")).toBe("true"))
    const describedBy = box.getAttribute("aria-describedby") ?? ""
    const errorId = describedBy.split(" ").find((id) => document.getElementById(id)?.textContent?.includes("required"))
    expect(errorId).toBeTruthy()
  })

  it("conversational blocked step focuses the input and announces steps", async () => {
    render(
      <KiForm
        fields={[
          { name: "email", type: "email", label: "Email", required: true },
          { name: "name", type: "text", label: "Name", required: true },
        ]}
        variant="conversational"
        onSubmit={vi.fn()}
      />,
    )
    // Blocked advance: empty required step keeps focus on its input.
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    const email = screen.getByLabelText("Email") as HTMLInputElement
    await waitFor(() => expect(document.activeElement).toBe(email))
    expect(screen.getByRole("status").textContent).toContain("Step 1 of 2")

    // Valid advance moves focus and announces the new step.
    fireEvent.change(email, { target: { value: "a@b.com" } })
    fireEvent.click(screen.getByRole("button", { name: /Next/ }))
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Step 2 of 2"))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Name")))
  })

  it("endpoint status line uses a live region", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    vi.stubGlobal("fetch", fetchMock)
    try {
      render(
        <KiForm
          fields={[{ name: "email", type: "email", required: true }]}
          endpoint="https://example.com/hook"
          onSubmit={vi.fn()}
        />,
      )
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } })
      fireEvent.click(screen.getByRole("button", { name: "Submit" }))
      await waitFor(() => expect(screen.getByRole("status")).toBeTruthy())
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("closing a Studio modal restores focus to its trigger", async () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            open docs
          </button>
          {open && <DocsModal onClose={() => setOpen(false)} />}
        </>
      )
    }
    render(<Harness />)
    const trigger = screen.getByRole("button", { name: "open docs" })
    trigger.focus()
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy())
    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })
})
