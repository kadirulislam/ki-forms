import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * The studio accent is defined in two places.
 *
 * `ui.css` declares it as a token, and `App.tsx` also writes it onto
 * `document.documentElement` so a shadcn preset can override it at runtime.
 * The inline write happens *after* the stylesheet, so the JS value is the one
 * the page actually resolves — and the two silently drifted once already: the
 * CSS was moved to slate while the JS still set terracotta, and the page stayed
 * orange with no error anywhere.
 *
 * A source-level assertion is the only thing that catches this, because both
 * values are individually valid; only their disagreement is the bug.
 */

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")

/** The accent the JS writes for light mode, and the CSS token for the same. */
const LIGHT = "#0a0a0a"
const DARK = "#fafafa"
/** Every accent that has been retired. Listed so the palette cannot drift back. */
const RETIRED = ["#e05328", "#f97316", "#ea580c", "#c9441c", "#0f172a", "#e2e8f0"]

describe("studio accent token", () => {
  const css = read("../studio/ui.css")
  const app = read("../studio/App.tsx")

  it("declares a monochrome accent in both themes", () => {
    expect(css).toContain(`--studio-accent: ${LIGHT}`)
    expect(css).toContain(`--studio-accent: ${DARK}`)
    // The focus ring used to be orange, which put a warm glow on every input.
    expect(css).toContain(`--ring: ${LIGHT}`)
  })

  it("writes the same values from JS, so the inline override agrees", () => {
    expect(app).toContain(`dark ? "${DARK}" : "${LIGHT}"`)
  })

  it("has no retired accent value left anywhere in the studio", () => {
    const haystacks: Array<[string, string]> = [
      ["ui.css", css],
      ["App.tsx", app],
      ["BlocksPanel.tsx", read("../studio/components/BlocksPanel.tsx")],
      ["Inspector.tsx", read("../studio/components/Inspector.tsx")],
    ]
    for (const [name, text] of haystacks) {
      for (const value of RETIRED) {
        expect(text, `${name} still hardcodes ${value}`).not.toContain(value)
      }
    }
  })

  it("keeps the design square at the root rather than per component", () => {
    // Stated once for the whole subtree. 103 `rounded-*` utilities are still in
    // the components; the override is what actually makes them square, and it
    // exempts the device preview so those frames still read as hardware.
    expect(css).toContain("border-radius: 0 !important")
    expect(css).toContain(":not([data-ki-preview] *)")
  })

  it("has no label that will vanish on the accent in dark mode", () => {
    // The accent is near-white in dark mode, so any `text-white` sitting on a
    // `bg-studio-accent` surface is white on white. These must be
    // `text-background`, which inverts with the theme.
    const onAccent: Array<[string, string]> = [
      ["ui/badge.tsx", read("../studio/components/ui/badge.tsx")],
      ["ui/button.tsx", read("../studio/components/ui/button.tsx")],
      ["ui/input.tsx", read("../studio/components/ui/input.tsx")],
      ["App.tsx", app],
      ["FormCanvas.tsx", read("../studio/components/FormCanvas.tsx")],
      ["StylePanel.tsx", read("../studio/components/StylePanel.tsx")],
    ]
    for (const [name, text] of onAccent) {
      expect(text, `${name}: white text on the studio accent`).not.toMatch(/bg-studio-accent[^\n]*\btext-white\b/)
      expect(text, `${name}: hardcoded #ffffff ink on the studio accent`).not.toMatch(/studio-accent[^}]*color: "#ffffff"/)
    }
  })

  it("keeps the canvas paper light in dark mode unless the form themes itself", () => {
    // The library's ink is dark. Letting the sheet follow the Studio theme gave
    // a near-black label on a near-black sheet — ~1.1:1, effectively invisible.
    const canvas = read("../studio/components/FormCanvas.tsx")
    expect(canvas).toContain('theme?.surfaceColor || (dark ? "#f8fafc" : "#ffffff")')
    expect(canvas).toContain('theme?.textColor || "#111827"')
  })
})
