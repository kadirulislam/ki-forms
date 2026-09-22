import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CodeModal, PreviewOverlay, SheetsModal, DocsModal } from "../studio/components/Modals"
import { StudioCopyButton, ValidationSummary, ConfirmApplyDialog } from "../studio/components/StudioModal"

function mockClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
  return writeText
}

describe("studio modal primitives", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("copy button copies text and announces it", async () => {
    const writeText = mockClipboard()
    render(<StudioCopyButton getText={() => "hello"} label="copy me" />)
    fireEvent.click(screen.getByRole("button", { name: "copy me" }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("hello"))
    expect(screen.getByRole("button", { name: "copy me" }).textContent).toContain("copied!")
  })

  it("validation summary exposes errors as an alert", () => {
    render(<ValidationSummary error="Bad field (fields[0].name)" />)
    expect(screen.getByRole("alert").textContent).toContain("Bad field")
  })

  it("confirm dialog confirms and cancels", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(<ConfirmApplyDialog open={false} onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.queryByRole("dialog")).toBeNull()
    rerender(<ConfirmApplyDialog open onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByRole("dialog")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Replace" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it("code modal asks for confirmation before replacing a non-empty canvas", async () => {
    mockClipboard()
    const onApply = vi.fn()
    const onClose = vi.fn()
    render(
      <CodeModal
        fields={[{ name: "email", type: "email" }]}
        theme={{}}
        variant="classic"
        onApplyDocument={onApply}
        onClose={onClose}
      />,
    )
    const editor = screen.getByLabelText("Schema JSON editor") as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: JSON.stringify([{ name: "phone", type: "tel" }]) } })
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }))
    await waitFor(() => expect(screen.getByText("Replace current form?")).toBeTruthy())
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Replace" }))
    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1))
    expect(onApply.mock.calls[0][0].fields).toEqual([{ name: "phone", type: "tel" }])
    expect(onClose).toHaveBeenCalled()
  })

  it("code modal shows validation errors without applying", async () => {
    const onApply = vi.fn()
    render(
      <CodeModal fields={[]} theme={{}} variant="classic" onApplyDocument={onApply} onClose={vi.fn()} />,
    )
    const editor = screen.getByLabelText("Schema JSON editor") as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: "not-json" } })
    // Live validation shows the parse error immediately (before Apply).
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }))
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0))
    expect(onApply).not.toHaveBeenCalled()
  })

  it("code modal settings tab toggles language and export includes", async () => {
    render(
      <CodeModal fields={[{ name: "email", type: "email" }]} theme={{ accentColor: "#000" }} variant="classic" endpoint="https://example.com/hook" onApplyDocument={vi.fn()} onClose={vi.fn()} />,
    )
    const activateTab = async (name: RegExp | string) => {
      const t = screen.getByRole("tab", { name })
      t.focus()
      fireEvent.mouseDown(t)
      fireEvent.mouseUp(t)
      fireEvent.click(t)
    }
    await activateTab("Settings")
    await waitFor(() => expect(screen.getByText("Language")).toBeTruthy())
    expect(screen.getByText("Current document")).toBeTruthy()
    // Switch to JavaScript — React tab should drop TS types.
    fireEvent.click(screen.getByRole("button", { name: /JavaScript/ }))
    await activateTab(/React component/)
    await waitFor(() => expect(screen.getByLabelText("Generated React component")).toBeTruthy())
    const reactOutput = screen.getByLabelText("Generated React component")
    expect(reactOutput.textContent).not.toContain("InferFormValues")
    expect(reactOutput.textContent).not.toContain(": FormValues")
  })

  it("code modal reset restores the editor to the canvas schema", async () => {
    render(
      <CodeModal fields={[{ name: "email" }]} theme={{}} variant="classic" onApplyDocument={vi.fn()} onClose={vi.fn()} />,
    )
    const editor = screen.getByLabelText("Schema JSON editor") as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: "not-json" } })
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    await waitFor(() => expect(editor.value).toContain('"email"'))
  })

  it("preview overlay is labelled as a dialog", () => {
    render(<PreviewOverlay fields={[{ name: "email" }]} theme={{}} variant="classic" device="desktop" onClose={vi.fn()} />)
    expect(screen.getByRole("dialog", { name: "Form preview" })).toBeTruthy()
  })

  it("sheets modal validates the Apps Script URL", () => {
    render(<SheetsModal onConnect={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByLabelText("Apps Script web app URL") as HTMLInputElement
    fireEvent.change(input, { target: { value: "https://evil.example/hook" } })
    expect(screen.getByRole("alert").textContent).toContain("Apps Script")
  })

  it("docs modal searches sections and navigates prev/next", async () => {
    mockClipboard()
    render(<DocsModal onClose={vi.fn()} />)
    // Full handbook present.
    expect(screen.getByRole("button", { name: "Keyboard shortcuts" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Troubleshooting" })).toBeTruthy()
    // Search filters the nav.
    const search = screen.getByLabelText("Search documentation") as HTMLInputElement
    fireEvent.change(search, { target: { value: "endpoint" } })
    await waitFor(() => expect(screen.queryByRole("button", { name: "Themes" })).toBeNull())
    expect(screen.getByRole("button", { name: "Responses" })).toBeTruthy()
    // Clear search, open Conditions via nav, check example + copy.
    fireEvent.change(search, { target: { value: "" } })
    fireEvent.click(screen.getByRole("button", { name: "Conditions" }))
    expect(screen.getByText("Condition examples")).toBeTruthy()
    expect(screen.getByRole("button", { name: "copy example" })).toBeTruthy()
    // Prev/next moves through the handbook.
    fireEvent.click(screen.getByRole("button", { name: /Next:/ }))
    await waitFor(() => expect(screen.getByRole("heading", { name: "Validation" })).toBeTruthy())
    fireEvent.click(screen.getByRole("button", { name: /Previous:/ }))
    await waitFor(() => expect(screen.getByRole("heading", { name: "Conditions" })).toBeTruthy())
  })
})
