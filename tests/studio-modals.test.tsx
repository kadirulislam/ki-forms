import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { CodeModal, PreviewOverlay, SheetsModal } from "../studio/components/Modals"
import { StudioCopyButton, ValidationSummary, ConfirmApplyDialog } from "../studio/components/StudioModal"
import { DEVICE_CONTENT_WIDTH } from "../studio/components/DeviceFrame"

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

  it("code modal toolbar wraps and keeps accessible names when labels collapse", () => {
    render(
      <CodeModal fields={[{ name: "email", type: "email" }]} theme={{}} variant="classic" onApplyDocument={vi.fn()} onClose={vi.fn()} />,
    )
    // Regression: four full-width labels overflowed a phone-width dialog and the
    // dialog's overflow-hidden clipped the trailing buttons away.
    const toolbar = screen.getByRole("button", { name: "Reset" }).closest("div.flex.shrink-0")
    expect(toolbar).toBeTruthy()
    expect(toolbar!.className).toContain("flex-wrap")

    // Labels collapse to icons below sm, so the name must come from aria-label —
    // otherwise the visible text would be the only (width-dependent) source.
    for (const name of ["Reset", "Download .json", "Apply changes", "copy"]) {
      const button = screen.getByRole("button", { name })
      expect(button.getAttribute("aria-label")).toBe(name)
    }
  })

  it("code modal tabs stay inside narrow dialogs", async () => {
    render(
      <CodeModal fields={[{ name: "email", type: "email" }]} theme={{}} variant="classic" onApplyDocument={vi.fn()} onClose={vi.fn()} />,
    )
    // Five w-fit triggers overflowed the dialog; the strip now shortens labels
    // below sm and scrolls if that is still not enough.
    const strip = screen.getByRole("tablist", { name: "Code and schema sections" })
    expect(strip.className).toContain("w-full")
    expect(strip.className).toContain("sm:w-fit")
    expect(strip.parentElement!.className).toContain("overflow-x-auto")

    for (const name of ["Schema JSON", "React component", "Import code", "CSS", "Settings"]) {
      const tab = screen.getByRole("tab", { name })
      // Full label in the accessible name + tooltip, compact label on screen.
      expect(tab.getAttribute("aria-label")).toBe(name)
      expect(tab.getAttribute("title")).toBe(name)
      expect(tab.textContent).toContain(name === "Schema JSON" ? "JSON" : name === "React component" ? "React" : name === "Import code" ? "Import" : name)
    }
  })

  it("code modal panes scroll instead of clipping their content", () => {
    render(
      <CodeModal fields={[{ name: "email", type: "email" }]} theme={{}} variant="classic" onApplyDocument={vi.fn()} onClose={vi.fn()} />,
    )
    // Regression: overflow-hidden clipped the hint text below the editor on
    // short viewports (landscape phones) with no way to scroll to it.
    const pane = screen.getByLabelText("Schema JSON editor").closest('[role="tabpanel"]')
    expect(pane).toBeTruthy()
    expect(pane!.className).toContain("overflow-y-auto")
    expect(pane!.className).not.toContain("overflow-hidden")

    // The editor is bounded by the viewport rather than a fixed 240px floor.
    const editor = screen.getByLabelText("Schema JSON editor")
    expect(editor.className).toContain("dvh")
  })

  it("code modal keeps a single Import from code action", () => {
    render(
      <CodeModal fields={[{ name: "email" }]} theme={{}} variant="classic" onApplyDocument={vi.fn()} onClose={vi.fn()} />,
    )
    // Regression: the Import code pane repeated the toolbar's primary action,
    // so the same button name appeared twice in the dialog.
    const trigger = screen.getByRole("tab", { name: "Import code" })
    fireEvent.mouseDown(trigger)
    fireEvent.mouseUp(trigger)
    fireEvent.click(trigger)
    expect(screen.getAllByRole("button", { name: "Import from code" })).toHaveLength(1)
  })

  it("preview renders inside a labelled device frame on the shared modal", () => {
    render(<PreviewOverlay fields={[{ name: "email" }]} theme={{}} variant="classic" device="desktop" onClose={vi.fn()} />)
    expect(screen.getByRole("dialog", { name: /Preview/ })).toBeTruthy()
    // The frame names the device and its viewport, and the form sits inside it.
    expect(screen.getAllByText("MacBook Pro").length).toBeGreaterThan(0)
    expect(screen.getByText("1280 × 800")).toBeTruthy()
    expect(document.querySelector("[data-ki-preview]")).toBeTruthy()
    expect(screen.getByLabelText(/email/i)).toBeTruthy()
  })

  it("preview switches device frames, including tablet", () => {
    const onDeviceChange = vi.fn()
    const { rerender } = render(
      <PreviewOverlay
        fields={[{ name: "email" }]}
        theme={{}}
        variant="classic"
        device="desktop"
        onDeviceChange={onDeviceChange}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Tablet/ }))
    expect(onDeviceChange).toHaveBeenCalledWith("tablet")

    // Tablet used to be unreachable: the prop only accepted desktop | mobile.
    rerender(
      <PreviewOverlay
        fields={[{ name: "email" }]}
        theme={{}}
        variant="classic"
        device="tablet"
        onDeviceChange={onDeviceChange}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getAllByText("iPad").length).toBeGreaterThan(0)
    expect(screen.getByText("834 × 1112")).toBeTruthy()
  })

  it("device frames scale to fit rather than overflowing the modal", () => {
    // jsdom has no layout, so this asserts the arithmetic that drives the scale:
    // each frame's measured width must match what its markup actually renders.
    expect(DEVICE_CONTENT_WIDTH.mobile).toBe(390)
    expect(DEVICE_CONTENT_WIDTH.tablet).toBe(834)
    expect(DEVICE_CONTENT_WIDTH.desktop).toBe(1280)
    for (const device of ["desktop", "tablet", "mobile"] as const) {
      const { unmount } = render(
        <PreviewOverlay fields={[{ name: "email" }]} theme={{}} variant="classic" device={device} onClose={vi.fn()} />,
      )
      const screen = document.querySelector("[data-device-screen]") as HTMLElement
      // The screen is the query container and keeps the device's true pixel
      // width, so the two-column collapse behaves like the real device.
      expect(getComputedStyle(screen).width).toBe(`${DEVICE_CONTENT_WIDTH[device]}px`)
      expect(getComputedStyle(screen).containerType).toBe("inline-size")
      unmount()
    }
  })

  it("preview device frame is the query container that collapses two-column rows", () => {
    render(
      <PreviewOverlay
        fields={[{ name: "a", width: "half" }, { name: "b", width: "half" }]}
        theme={{}}
        variant="classic"
        device="mobile"
        onClose={vi.fn()}
      />,
    )
    // The query container is the device screen, not the library's .ki-form.
    const screen = document.querySelector('[style*="container-name"]') as HTMLElement | null
    expect(screen).toBeTruthy()
    expect(screen!.style.containerType).toBe("inline-size")
    expect(screen!.style.containerName).toBe("ki-preview")
    expect((document.querySelector(".ki-form") as HTMLElement | null)?.style.containerType ?? "").toBe("")
  })

  it("sheets modal validates the Apps Script URL", () => {
    render(<SheetsModal onConnect={vi.fn()} onClose={vi.fn()} />)
    const input = screen.getByLabelText("Apps Script web app URL") as HTMLInputElement
    fireEvent.change(input, { target: { value: "https://evil.example/hook" } })
    expect(screen.getByRole("alert").textContent).toContain("Apps Script")
  })
})
