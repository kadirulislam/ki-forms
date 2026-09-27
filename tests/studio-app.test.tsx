import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import App from "../studio/App"
import type { Field } from "../src/types"

/**
 * Studio App shell smoke tests (shadcn rebuild, responsive shell).
 *
 * Both side panels are permanently docked, so there is no drawer to open and
 * the rail/panel controls are reachable at any viewport width. The canvas
 * renders the real KiForm, so "add field" must produce real inputs.
 */

function panelButton(label: string): HTMLElement {
  const btns = screen.getAllByRole("button", { name: label })
  expect(btns.length, `expected a ${label} button`).toBeGreaterThan(0)
  return btns[0]
}

/**
 * Kept as a no-op call site so the tests read the same as before the panels
 * became permanently docked. Assert it rather than clicking: if the panel ever
 * regresses to collapsed-by-default, every panel test should say so plainly
 * instead of silently clicking a toggle open.
 */
function openDrawer() {
  const collapsed = screen.queryByRole("button", { name: "Open panels" })
  if (collapsed) throw new Error("left panel is collapsed; the docked layout regressed")
}

/**
 * `waitFor` keeps its own 1s default, which vitest's `testTimeout` does not
 * change. A cold mount of the whole Studio App costs 5-6s in jsdom, so anything
 * waiting on a portal-rendered overlay (a Radix menu) needs room for that —
 * otherwise the test fails on timing alone and proves nothing.
 */
function waitForOverlay<T>(fn: () => T): Promise<T> {
  return waitFor(fn, { timeout: 6000 })
}

describe("studio app (shadcn rebuild)", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("mounts the shell with both side panels docked and visible", () => {
    const { container } = render(<App />)
    expect(screen.getByPlaceholderText("Untitled form")).toBeTruthy()
    expect(container.querySelector(".studio-root")).toBeTruthy()
    // Overflow menu + the panel toggle, which now collapses rather than opens.
    expect(panelButton("More actions")).toBeTruthy()
    expect(panelButton("Collapse panel")).toBeTruthy()
    // The rail and its panels are in the layout immediately — no drawer.
    expect(screen.queryByRole("button", { name: "Open panels" })).toBeNull()
    expect(panelButton("Templates")).toBeTruthy()
    expect(panelButton("Blocks")).toBeTruthy()
    expect(panelButton("Style")).toBeTruthy()
    expect(panelButton("Form")).toBeTruthy()
    // The palette column is a sibling of the rail, not a fixed overlay.
    const rail = screen.getByRole("navigation", { name: "Panels" })
    const palette = rail.nextElementSibling
    expect(palette?.tagName).toBe("ASIDE")
    expect(palette?.className).toContain("w-80")
    expect(palette?.className).not.toContain("fixed")
  })

  it("keeps the right column docked with no field selected, showing the form", () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({
        title: "Signup",
        variant: "conversational",
        endpoint: "https://x.dev/h",
        fields: [
          { name: "alpha", type: "text" },
          { name: "beta", type: "email", showIf: { field: "alpha", equals: "" } },
        ],
        theme: {},
      }),
    )
    render(<App />)

    // Docked means always present. It used to be gated on a selection, so the
    // column vanished the moment you clicked the canvas.
    const panel = screen.getByTestId("inspector-panel")
    expect(panel).toBeTruthy()
    expect(screen.getByText("Form overview")).toBeTruthy()

    // And it must be worth reading: a summary of the actual document, not a
    // bare "nothing selected" notice.
    expect(screen.getByText("Signup")).toBeTruthy()
    expect(screen.getByText("2 · 2 types")).toBeTruthy()
    expect(screen.getByText("Conversational")).toBeTruthy()
    expect(screen.getByText("1 field shown conditionally")).toBeTruthy()
    expect(screen.getByText("https://x.dev/h")).toBeTruthy()
    // No field is selected, so there is nothing to deselect.
    expect(screen.queryByRole("button", { name: "Close field settings" })).toBeNull()
  })

  it("swaps the right column to field settings once a field is selected", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "T", fields: [{ name: "alpha" }], theme: {}, variant: "classic" }),
    )
    render(<App />)
    expect(screen.getByText("Form overview")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Field alpha" }))

    await waitForOverlay(() => expect(screen.getByText("Field settings")).toBeTruthy())
    expect(screen.queryByText("Form overview")).toBeNull()
    // Now there is something to deselect.
    expect(screen.getByRole("button", { name: "Close field settings" })).toBeTruthy()
  })

  /**
   * One menu per file, deliberately.
   *
   * Radix overlays keep module-level state (a `DismissableLayer` stack, the
   * `hideOthers` aria-hidden bookkeeping) that jsdom never unwinds. Once a
   * context menu has been opened in a test file, no later menu in that file
   * will open — not even after an explicit Escape. So this is the single
   * jsdom test for the menu: it asserts the full item set and the boundary
   * states in one pass. The mutations each item performs (Duplicate, Delete,
   * Move) are asserted against real behaviour in headless Chrome instead,
   * which is also the only place menu positioning can be checked at all.
   */
  it("right-clicking a field offers the editor actions, with bounds marked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true })
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "T", fields: [{ name: "alpha" }, { name: "beta" }], theme: {}, variant: "classic" }),
    )
    render(<App />)

    const card = screen.getByRole("button", { name: "Field alpha" })
    fireEvent.contextMenu(card)
    await waitForOverlay(() => expect(screen.getByRole("menu")).toBeTruthy())

    // The menu names the field it acts on.
    expect(within(screen.getByRole("menu")).getByText("alpha")).toBeTruthy()
    for (const label of [/Duplicate field/i, /Copy field name/i, /Move up/i, /Move down/i, /Delete field/i]) {
      expect(screen.getByRole("menuitem", { name: label })).toBeTruthy()
    }
    // Context-aware: the choices that need a value are submenus, not toggles.
    for (const submenu of [/^Label$/, /^Width$/, /^Type$/, /Show only when/i]) {
      expect(screen.getByRole("menuitem", { name: submenu })).toBeTruthy()
    }
    // alpha is the first field, so it cannot move up. Marked disabled rather
    // than silently doing nothing, so the menu always shows every move.
    expect(screen.getByRole("menuitem", { name: /Move up/i }).hasAttribute("data-disabled")).toBe(true)
    expect(screen.getByRole("menuitem", { name: /Move down/i }).hasAttribute("data-disabled")).toBe(false)

    fireEvent.click(screen.getByRole("menuitem", { name: /Copy field name/i }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("alpha"))
  })

  /**
   * Regression: the context menu must only ever write a document that survives
   * a reload.
   *
   * `loadDoc` falls back to the whole signup template if `validateSchema`
   * rejects the field array, so a single invalid property silently costs the
   * user their whole form. The canonical validator requires exactly one of
   * `equals` / `notEquals` on a condition, which is easy to get wrong when
   * writing `{ field }` from a menu that has not asked for a value yet.
   */
  it("every field shape the context menu can write passes the canonical validator", async () => {
    const { validateFields } = await import("../src/schema/validate")
    const { TEMPLATES } = await import("../studio/lib/templates")

    // Each entry is a field exactly as one of the menu's actions produces it.
    const written: Record<string, unknown>[] = [
      { name: "a", required: true },
      { name: "a", label: false },
      { name: "a", width: "full" },
      { name: "a", width: "half" },
      { name: "a", type: "email" },
      { name: "a", type: "select" },
      // Leaving `select` must not leave orphaned options behind.
      { name: "a", type: "text" },
      // "Show only when" from the context menu: it picks the field but not the
      // value, so the comparison has to be seeded.
      { name: "a", showIf: { field: "b", equals: "" } },
      { name: "a", showIf: { field: "b", equals: "x" } },
      { name: "a", showIf: { field: "b", notEquals: "x" } },
    ]

    for (const field of written) {
      const result = validateFields([{ name: "b", type: "text" }, field])
      expect(result.success, JSON.stringify(field)).toBe(true)
    }

    // Why the comparison is seeded rather than left for the user. This is the
    // exact shape the menu used to write, and it is rejected — which costs the
    // user their entire form on the next reload.
    const bare = validateFields([{ name: "b" }, { name: "a", showIf: { field: "b" } }])
    expect(bare.success).toBe(false)

    // A full template with a condition applied must survive too.
    const contact = TEMPLATES.find((t) => t.id === "contact")!
    const base = contact.fields.filter((f) => typeof f === "object") as Field[]
    const withCondition = base.map((f, i) => (i === 1 ? { ...f, showIf: { field: base[0].name, equals: "" } } : f))
    expect(validateFields(withCondition).success).toBe(true)
  })

  it("resolves the docs URL from wherever the Studio is served", async () => {
    const { resolveDocsUrl } = await import("../studio/lib/docs-url")
    // The published layout: docs app at /ki-forms/, Studio in a subdirectory.
    expect(resolveDocsUrl("https://kadirulislam.github.io", "/ki-forms/studio/")).toBe(
      "https://kadirulislam.github.io/ki-forms/#/docs/getting-started",
    )
    // A direct hit on index.html must resolve to the same place.
    expect(resolveDocsUrl("https://kadirulislam.github.io", "/ki-forms/studio/index.html")).toBe(
      "https://kadirulislam.github.io/ki-forms/#/docs/getting-started",
    )
    // Studio at the domain root.
    expect(resolveDocsUrl("https://forms.example.com", "/studio")).toBe(
      "https://forms.example.com/#/docs/getting-started",
    )
    // Dev runs the docs site on its own port.
    expect(resolveDocsUrl("http://localhost:5173", "/", true)).toBe("http://localhost:5174/#/docs/getting-started")
  })

  it("sends the Docs button to the real documentation, not a modal", () => {
    render(<App />)
    // The Studio no longer keeps its own copy of the docs, so there is exactly
    // one place to keep in sync — and it is the one that gets shipped.
    const link = screen.getByRole("link", { name: /Docs/i })
    expect(link.getAttribute("href")).toContain("#/docs/getting-started")
    expect(link.getAttribute("target")).toBe("_blank")
    // No in-app guide is left to open.
    expect(screen.queryByRole("dialog")).toBeNull()
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

  it("templates live in the left panel with previews, not a modal", () => {
    render(<App />)
    openDrawer()
    fireEvent.click(panelButton("Templates"))
    for (const name of ["Blank canvas", "Waitlist", "Contact form", "Signup with conditionals", "Job application", "Feedback"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeTruthy()
    }
    // Every card previews its form as a constant-height stack of wireframes.
    expect(screen.getAllByTestId("template-preview-rows")).toHaveLength(6)
  })

  it("applies a template to an empty canvas without asking", () => {
    localStorage.setItem("ki-studio-doc-v2", JSON.stringify({ title: "Empty", fields: [], theme: {}, variant: "classic" }))
    render(<App />)

    openDrawer()
    fireEvent.click(panelButton("Templates"))
    fireEvent.click(screen.getByRole("button", { name: /Waitlist/ }))

    // Applied straight away — no confirmation for an empty canvas.
    expect(screen.queryByText("Replace current form?")).toBeNull()
  })

  it("confirms before a template replaces existing fields", () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "Has fields", fields: [{ name: "email", type: "email" }], theme: {}, variant: "classic" }),
    )
    render(<App />)

    openDrawer()
    fireEvent.click(panelButton("Templates"))
    fireEvent.click(screen.getByRole("button", { name: /Contact form/ }))

    expect(screen.getByText("Replace current form?")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.queryByText("Replace current form?")).toBeNull()
  })

  it("no longer offers a topbar or overflow Templates entry point", () => {
    render(<App />)
    // Templates live in the left panel now, so the topbar button and the
    // mobile overflow item are both gone. Matched exactly to avoid the rail
    // tab, which is legitimately also called "Templates".
    expect(screen.queryByRole("button", { name: "Templates…" })).toBeNull()
    expect(screen.queryByRole("menuitem", { name: "Templates…" })).toBeNull()
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

  it("Inspector exposes a Full/Half width control that reaches the document", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "Width", fields: [{ name: "email", type: "email" }], theme: {}, variant: "classic" }),
    )
    render(<App />)

    openDrawer()
    // The canvas card, not the Blocks palette entry of the same name.
    fireEvent.click(screen.getByRole("button", { name: "Field email" }))
    await waitFor(() => expect(screen.getAllByText("Field settings").length).toBeGreaterThan(0))

    // Defaults to full width, and the half choice lands in the persisted doc.
    expect(screen.getByRole("radio", { name: /Full width/ }).getAttribute("aria-checked")).toBe("true")

    fireEvent.click(screen.getByRole("radio", { name: /Half width/ }))
    await waitFor(() => expect(screen.getByRole("radio", { name: /Half width/ }).getAttribute("aria-checked")).toBe("true"))

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("ki-studio-doc-v2") ?? "{}")
      expect(saved.fields[0].width).toBe("half")
    })
  })

  it("opens a shared form from a #ki=v1 link on an empty canvas", async () => {
    const { buildShareUrl } = await import("../src/share/codec")
    const { TEMPLATES } = await import("../studio/lib/templates")
    const tpl = TEMPLATES.find((t) => t.id === "contact")!
    const built = await buildShareUrl(
      { version: 1, name: "Shared contact", fields: tpl.fields as never, variant: "classic" },
      "https://example.com",
      "/studio/",
    )
    if (!built.ok) throw new Error(built.error)
    const hash = built.payload.slice(built.payload.indexOf("#"))

    localStorage.setItem("ki-studio-doc-v2", JSON.stringify({ title: "Empty", fields: [], theme: {}, variant: "classic" }))
    window.history.replaceState(null, "", `/studio/${hash}`)

    render(<App />)

    // The shared document replaced the empty canvas, and the hash was consumed
    // so a refresh does not re-prompt.
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem("ki-studio-doc-v2") ?? "{}")
      expect(saved.fields).toHaveLength(tpl.fields.length)
      expect(saved.title).toBe("Shared contact")
    })
    expect(window.location.hash).toBe("")
  })

  it("confirms before a shared link replaces existing fields", async () => {
    const { buildShareUrl } = await import("../src/share/codec")
    const built = await buildShareUrl({ version: 1, fields: [{ name: "fromLink" }] }, "https://example.com", "/studio/")
    if (!built.ok) throw new Error(built.error)
    const hash = built.payload.slice(built.payload.indexOf("#"))

    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "Mine", fields: [{ name: "existing" }], theme: {}, variant: "classic" }),
    )
    window.history.replaceState(null, "", `/studio/${hash}`)

    render(<App />)

    await waitFor(() => expect(screen.getByText("Open the shared form?")).toBeTruthy())
    // Nothing applied until confirmed.
    expect(JSON.parse(localStorage.getItem("ki-studio-doc-v2") ?? "{}").fields[0].name).toBe("existing")

    fireEvent.click(screen.getByRole("button", { name: "Open" }))
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem("ki-studio-doc-v2") ?? "{}").fields[0].name).toBe("fromLink")
    })
  })

  it("survives a damaged share link without wiping the document", async () => {
    localStorage.setItem(
      "ki-studio-doc-v2",
      JSON.stringify({ title: "Mine", fields: [{ name: "existing" }], theme: {}, variant: "classic" }),
    )
    window.history.replaceState(null, "", "/studio/#ki=v1.definitely-not-valid-deflate")

    render(<App />)

    await waitFor(() => expect(screen.getAllByText(/damaged or incomplete/i).length).toBeGreaterThan(0))
    // The user's own work is untouched.
    expect(JSON.parse(localStorage.getItem("ki-studio-doc-v2") ?? "{}").fields[0].name).toBe("existing")
    // No clobber prompt for something that never parsed.
    expect(screen.queryByText("Open the shared form?")).toBeNull()
  })

  it("offers Copy share link in the overflow menu", () => {
    render(<App />)
    const trigger = screen.getByRole("button", { name: "More actions" })
    // Radix opens a dropdown on pointerdown or Enter, not on a plain click.
    // jsdom has no PointerEvent implementation, so drive it from the keyboard.
    trigger.focus()
    fireEvent.keyDown(trigger, { key: "Enter" })
    expect(screen.getAllByRole("menuitem", { name: /Copy share link/i }).length).toBeGreaterThan(0)
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
