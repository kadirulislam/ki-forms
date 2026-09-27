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
const LIGHT_SLATE = "#0f172a"
const DARK_SLATE = "#e2e8f0"
const RETIRED = ["#e05328", "#f97316", "#ea580c", "#c9441c"]

describe("studio accent token", () => {
  const css = read("../studio/ui.css")
  const app = read("../studio/App.tsx")

  it("declares a slate accent in both themes", () => {
    expect(css).toContain(`--studio-accent: ${LIGHT_SLATE}`)
    expect(css).toContain(`--studio-accent: ${DARK_SLATE}`)
    // The focus ring used to be orange, which put a warm glow on every input.
    expect(css).toContain(`--ring: ${LIGHT_SLATE}`)
  })

  it("writes the same slate values from JS, so the inline override agrees", () => {
    expect(app).toContain(`dark ? "${DARK_SLATE}" : "${LIGHT_SLATE}"`)
  })

  it("has no retired terracotta values left anywhere in the studio", () => {
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
})
