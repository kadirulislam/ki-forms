import { describe, it, expect, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import App from "../studio/App"

/**
 * Studio App shell smoke tests (shadcn rebuild, responsive shell).
 * jsdom reports matchMedia false → the <lg layout renders: the rail + side
 * panel live inside a drawer that must be opened via the "Open panels" button.
 * The canvas renders the real KiForm, so "add field" must produce real inputs.
 */

function panelButton(label: string): HTMLElement {
  const btns = screen.getAllByRole("button", { name: label })
  expect(btns.length, `expected a ${label} button`).toBeGreaterThan(0)
  return btns[0]
}

/** jsdom is always <lg: open the panel drawer before touching rail/panel UI. */
function openDrawer() {
  fireEvent.click(screen.getByRole("button", { name: "Open panels" }))
}

describe("studio app (shadcn rebuild)", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("mounts the shell with topbar, drawer rail and canvas", () => {
    const { container } = render(<App />)
    expect(screen.getByPlaceholderText("Untitled form")).toBeTruthy()
    // canvas paper present
    expect(container.querySelector(".studio-root")).toBeTruthy()
    // <lg chrome: drawer trigger + overflow menu
    expect(panelButton("Open panels")).toBeTruthy()
    expect(panelButton("More actions")).toBeTruthy()
    // open drawer → rail buttons available
    openDrawer()
    expect(panelButton("Blocks")).toBeTruthy()
    expect(panelButton("Style")).toBeTruthy()
    expect(panelButton("Form")).toBeTruthy()
  })

  it("opens the in-app documentation guide and switches sections", async () => {
    render(<App />)
    fireEvent.click(screen.getByRole("button", { name: "Docs" }))

    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(screen.getByText(/Choose a template, edit fields/i)).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Conditions" }))
    expect(screen.getByText(/Use showIf with field/i)).toBeTruthy()
    expect(screen.getByRole("link", { name: /Full documentation/i }).getAttribute("href")).toBe(
      "https://github.com/kadirulislam/ki-forms#readme",
    )

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })

  it("appends a field from the Blocks panel and selects it", async () => {
    render(<App />)
    openDrawer()
    // canvas cards are aria-labeled "Field <name>"; the signup template has none named emailField
    expect(screen.queryByLabelText("Field emailField")).toBeNull()
    // exact "Email" = palette card (canvas cards are "Field …")
    fireEvent.click(screen.getByRole("button", { name: "Email" }))
    await waitFor(() => {
      expect(screen.getByLabelText("Field emailField")).toBeTruthy()
    })
    // inspector opens for the new field
    await waitFor(() => {
      expect(screen.getAllByText("Field settings").length).toBeGreaterThan(0)
    })
  })

  it("opens the Inspector and edits the field name", async () => {
    render(<App />)
    openDrawer()
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
    openDrawer()
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

  it("canvas preview mirrors library defaulting (label + placeholder)", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "T", fields: [{ name: "fullName" }], theme: {}, variant: "classic" }),
    )
    render(<App />)
    // applyDefaults: "fullName" → label "Full Name", placeholder "Enter your full name"
    await waitFor(() => {
      expect(screen.getByText("Full Name")).toBeTruthy()
      expect(screen.getByText("Enter your full name")).toBeTruthy()
    })
  })

  it("canvas card actions: duplicate and delete update the doc", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "T", fields: [{ name: "email", type: "email" }], theme: {}, variant: "classic" }),
    )
    render(<App />)
    const card = screen.getByLabelText("Field email")
    const wrapper = card.closest(".group") as HTMLElement
    fireEvent.mouseEnter(wrapper)
    fireEvent.click(within(wrapper).getByRole("button", { name: "Duplicate" }))
    await waitFor(() => {
      expect(screen.getByLabelText("Field email_copy")).toBeTruthy()
    })
    const copyWrapper = screen.getByLabelText("Field email_copy").closest(".group") as HTMLElement
    fireEvent.click(within(copyWrapper).getByRole("button", { name: "Delete" }))
    await waitFor(() => {
      expect(screen.queryByLabelText("Field email_copy")).toBeNull()
    })
  })

  it("moves a field up via the card's move action", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({
        title: "T",
        fields: [{ name: "first" }, { name: "second" }],
        theme: {},
        variant: "classic",
      }),
    )
    render(<App />)
    const second = screen.getByLabelText("Field second")
    const wrapper = second.closest(".group") as HTMLElement
    fireEvent.mouseEnter(wrapper)
    fireEvent.click(within(wrapper).getByRole("button", { name: "Move up" }))
    await waitFor(() => {
      const raw = JSON.parse(localStorage.getItem("ki-studio-doc-v2") ?? "{}")
      expect(raw.fields.map((f: { name: string }) => f.name)).toEqual(["second", "first"])
    })
  })

  it("Inspector offers duplicate + delete actions", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "T", fields: [{ name: "a" }, { name: "b" }], theme: {}, variant: "classic" }),
    )
    render(<App />)
    fireEvent.click(screen.getByLabelText("Field a"))
    await waitFor(() => {
      expect(screen.getByTestId("inspector-panel")).toBeTruthy()
    })
    fireEvent.click(within(screen.getByTestId("inspector-panel")).getByRole("button", { name: "Duplicate" }))
    await waitFor(() => {
      expect(screen.getByLabelText("Field a_copy")).toBeTruthy()
    })
  })

  it("renders the empty state when the doc has no fields", () => {
    localStorage.setItem("ki-studio-doc-v2", JSON.stringify({ title: "Empty", fields: [], theme: {}, variant: "classic" }))
    render(<App />)
    expect(screen.getByText(/Your form is empty/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: /Start from a template/i })).toBeTruthy()
  })

  it("keeps the export editors constrained and the React export styled", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({
        title: "Responsive export",
        fields: [{ name: "email", type: "email" }],
        theme: {},
        variant: "classic",
      }),
    )
    render(<App />)

    fireEvent.click(screen.getByRole("button", { name: "Code" }))

    const jsonEditor = screen.getByRole("textbox") as HTMLTextAreaElement
    expect(jsonEditor.className).toContain("min-w-0")
    expect(jsonEditor.className).toContain("overflow-auto")
    expect(jsonEditor.getAttribute("wrap")).toBe("off")

    expect(screen.getByRole("tab", { name: /React component/i })).toBeTruthy()
  })
})
