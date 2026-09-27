import { describe, it, expect } from "vitest"
import { clampSize, MIN_SIZE, viewportBounds, VIEWPORT_MARGIN, type Size } from "../studio/lib/use-resizable"

/**
 * Resize clamping.
 *
 * This is the arithmetic behind the resizable Preview dialog, and it is where
 * an off-screen or unusably small dialog comes from. jsdom has no layout, so the
 * drag itself is verified in a browser; the bounds it clamps to are pure and
 * belong here.
 */

const bounds = (maxWidth: number, maxHeight: number) => ({ maxWidth, maxHeight })

describe("clampSize", () => {
  it("passes a size that already fits through unchanged", () => {
    const size: Size = { width: 900, height: 600 }
    expect(clampSize(size, bounds(1200, 800))).toEqual(size)
  })

  it("refuses to go below the readable floor", () => {
    expect(clampSize({ width: 10, height: 10 }, bounds(1200, 800))).toEqual(MIN_SIZE)
  })

  it("refuses to exceed the viewport", () => {
    expect(clampSize({ width: 5000, height: 4000 }, bounds(1200, 800))).toEqual({ width: 1200, height: 800 })
  })

  it("rounds to whole pixels so the dialog never lands on a fraction", () => {
    expect(clampSize({ width: 900.4, height: 600.6 }, bounds(1200, 800))).toEqual({ width: 900, height: 601 })
  })

  it("never returns a size below the floor even when the viewport is tiny", () => {
    // A 200px-tall window: the floor wins, so the dialog stays usable and
    // scrollable rather than collapsing to nothing.
    const tiny = bounds(200, 200)
    expect(clampSize({ width: 500, height: 500 }, tiny)).toEqual(MIN_SIZE)
  })

  it("survives non-finite input without producing NaN", () => {
    const result = clampSize({ width: Number.NaN, height: Number.POSITIVE_INFINITY }, bounds(1200, 800))
    // NaN fails every comparison, so it falls through to the bound rather than
    // poisoning the layout.
    expect(Number.isFinite(result.width)).toBe(true)
    expect(Number.isFinite(result.height)).toBe(true)
  })
})

describe("viewportBounds", () => {
  it("leaves a margin on every side of the viewport", () => {
    const b = viewportBounds()
    expect(b.maxWidth).toBeLessThanOrEqual(window.innerWidth)
    expect(b.maxHeight).toBeLessThanOrEqual(window.innerHeight)
    expect(b.maxWidth).toBeGreaterThanOrEqual(MIN_SIZE.width)
    expect(b.maxHeight).toBeGreaterThanOrEqual(MIN_SIZE.height)
  })

  it("reports a margin wide enough to be visible", () => {
    expect(VIEWPORT_MARGIN).toBeGreaterThanOrEqual(8)
  })
})
