/**
 * theme prop — new in 2.1.0. Maps KiTheme tokens to --ki-* CSS variables.
 */
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { KiForm } from "../src"

describe("theme prop (new in 2.1.0)", () => {
  it("maps tokens to --ki-* custom properties on the form element", () => {
    const { container } = render(
      <KiForm
        fields={["email"]}
        theme={{ accentColor: "#ff0000", radius: "12px" }}
      />
    )

    const form = container.querySelector("form") as HTMLElement
    expect(form.style.getPropertyValue("--ki-accent")).toBe("#ff0000")
    expect(form.style.getPropertyValue("--ki-radius")).toBe("12px")
    // unspecified tokens fall back to defaults
    expect(form.style.getPropertyValue("--ki-border")).toBe("#d1d5db")
  })

  it("no theme prop -> no inline style (defaults come from CSS fallbacks)", () => {
    const { container } = render(<KiForm fields={["email"]} />)
    const form = container.querySelector("form") as HTMLElement
    expect(form.getAttribute("style")).toBeNull()
  })

  it("always carries the ki-form class and preserves custom className", () => {
    const { container } = render(<KiForm fields={["email"]} className="my-form" />)
    const form = container.querySelector("form") as HTMLElement
    expect(form.className).toBe("ki-form my-form")
  })
})
