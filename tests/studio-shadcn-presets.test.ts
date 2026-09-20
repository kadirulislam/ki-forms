import { describe, it, expect } from "vitest"
import { SHADCN_PRESETS, getShadcnPreset } from "../studio/lib/shadcn-presets"

describe("studio shadcn presets", () => {
  it("exposes the 8 stock shadcn color families", () => {
    const families = SHADCN_PRESETS.map((p) => p.family)
    expect(families).toEqual(["zinc", "red", "rose", "orange", "green", "blue", "yellow", "violet"])
  })

  it("maps every shadcn token onto a complete KiTheme (light + dark)", () => {
    for (const p of SHADCN_PRESETS) {
      for (const mode of [p.light, p.dark] as const) {
        for (const key of [
          "accentColor",
          "borderColor",
          "errorColor",
          "helperColor",
          "radius",
          "surfaceColor",
          "textColor",
          "fontFamily",
        ] as const) {
          expect(mode[key], `${p.id}.${key}`).toBeTruthy()
        }
      }
    }
  })

  it("keeps colors portable: hex/rgb only, no oklch() in exported tokens", () => {
    for (const p of SHADCN_PRESETS) {
      for (const mode of [p.light, p.dark]) {
        for (const value of Object.values(mode)) {
          expect(value).not.toMatch(/oklch/i)
        }
      }
    }
  })

  it("zinc light mirrors the stock shadcn light theme", () => {
    const zinc = getShadcnPreset("shadcn-zinc")!
    expect(zinc.light.accentColor).toBe("#18181b") // shadcn light primary
    expect(zinc.light.surfaceColor).toBe("#ffffff") // white background
    expect(zinc.light.textColor).toBe("#0a0a0a") // neutral-950 foreground
    expect(zinc.light.radius).toBe("0.625rem") // --radius 0.625rem
  })

  it("zinc dark flips surface/text like .dark does in shadcn apps", () => {
    const zinc = getShadcnPreset("shadcn-zinc")!
    expect(zinc.dark.surfaceColor).toBe("#0a0a0a")
    expect(zinc.dark.textColor).toBe("#fafafa")
    expect(zinc.dark.accentColor).toBe("#fafafa") // dark primary = near-white
  })

  it("light and dark presets share geometry (radius) but not colors", () => {
    for (const p of SHADCN_PRESETS) {
      expect(p.dark.radius).toBe(p.light.radius)
      expect(p.dark.accentColor).not.toBe(p.light.accentColor)
    }
  })

  it("getShadcnPreset returns undefined for unknown ids", () => {
    expect(getShadcnPreset("nope")).toBeUndefined()
  })
})
