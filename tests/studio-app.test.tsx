import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import App from "../studio/App"

/**
 * Studio App shell smoke tests (shadcn rebuild).
 * The canvas renders the real KiForm, so "add field" must produce real inputs.
 */

function panelButton(label: string): HTMLElement {
  const btns = screen.getAllByRole("button", { name: label })
  expect(btns.length, `expected a ${label} button`).toBeGreaterThan(0)
  return btns[0]
}

describe("studio app (shadcn rebuild)", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("mounts the shell with topbar, rail and canvas", () => {
    const { container } = render(<App />)
    expect(screen.getByPlaceholderText("Untitled form")).toBeTruthy()
    // canvas paper present
    expect(container.querySelector(".studio-root")).toBeTruthy()
    // rail buttons
    expect(panelButton("Blocks")).toBeTruthy()
    expect(panelButton("Style")).toBeTruthy()
    expect(panelButton("Form")).toBeTruthy()
    // topbar actions
    expect(panelButton("Templates")).toBeTruthy()
    expect(panelButton("Copy React code")).toBeTruthy()
  })

  it("appends a field from the Blocks panel and selects it", async () => {
    render(<App />)
    // default template (signup) already has one email input; adding makes two
    const before = screen.getAllByPlaceholderText("you@company.com").length
    fireEvent.click(screen.getByRole("button", { name: /email/i }))
    await waitFor(() => {
      expect(screen.getAllByPlaceholderText("you@company.com").length).toBe(before + 1)
    })
    // inspector opens for the new field
    await waitFor(() => {
      expect(screen.getAllByText("Field settings").length).toBeGreaterThan(0)
    })
  })

  it("opens the Inspector and edits the field name", async () => {
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: /^text$/i }))
    await waitFor(() => {
      expect(screen.getAllByText("Field settings").length).toBeGreaterThan(0)
    })
    const nameInputs = screen.getAllByLabelText("Name")
    fireEvent.change(nameInputs[0], { target: { value: "full_name" } })
    await waitFor(() => {
      expect((nameInputs[0] as HTMLInputElement).value).toBe("full_name")
    })
  })

  it("applies a shadcn preset from the Style panel and reflects it in the doc theme", async () => {
    render(<App />)
    fireEvent.click(panelButton("Style"))
    await waitFor(() => {
      expect(screen.getAllByText("shadcn/ui themes").length).toBeGreaterThan(0)
    })
    const presetButtons = screen.getAllByTitle("shadcn Blue")
    fireEvent.click(presetButtons[0])
    await waitFor(() => {
      const raw = localStorage.getItem("ki-studio-doc-v2") ?? "{}"
      const doc = JSON.parse(raw)
      expect(doc.theme.accentColor).toBe("#2563eb") // shadcn blue-600
      expect(doc.theme.surfaceColor).toBe("#ffffff")
    })
  })

  it("renders the empty state when the doc has no fields", () => {
    localStorage.setItem("ki-studio-doc-v2", JSON.stringify({ title: "Empty", fields: [], theme: {}, variant: "classic" }))
    render(<App />)
    expect(screen.getByText(/Drop your first field here/i)).toBeTruthy()
  })
})
