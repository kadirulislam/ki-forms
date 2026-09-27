import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * Chrome invariants that only a browser can show, asserted against the source.
 *
 * jsdom has no layout engine, so neither of these defects was visible to the
 * test suite: both rendered perfectly in jsdom and looked broken in Chrome.
 *
 *  1. The context menu's submenu triggers rendered their icons at lucide's
 *     default 24px while every plain item was pinned to 16px by
 *     `[&_svg]:size-4` — `ContextMenuSubTrigger` was simply missing the rule,
 *     so Label / Width / Show-only-when / Type looked oversized next to their
 *     neighbours.
 *
 *  2. The compact Blocks rows wrapped the `Wireframe` component, which is built
 *     from `w-full` / `px-2` / `h-6` for a ~100x48 card. In a 20px box it
 *     collapsed into unrecognisable blobs of differing shapes.
 *
 * A source assertion is the honest guard here: it cannot measure layout, but it
 * does catch the specific omission that caused each bug.
 */

const read = (relative: string) => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8")

const menu = read("../studio/components/ui/context-menu.tsx")
const blocks = read("../studio/components/BlocksPanel.tsx")

/** The rule that pins an icon to 16px. */
const ICON_RULE = "[&_svg]:size-4"

describe("context menu icon sizing", () => {
  it("pins icons to the same size on items, sub-triggers and radio items", () => {
    for (const fn of ["ContextMenuItem", "ContextMenuSubTrigger", "ContextMenuRadioItem"]) {
      const body = menu.slice(menu.indexOf(`function ${fn}(`))
      const end = body.indexOf("\nfunction ", 1)
      const source = end === -1 ? body : body.slice(0, end)
      expect(source, `${fn} is missing ${ICON_RULE}`).toContain(ICON_RULE)
    }
  })
})

describe("compact blocks palette", () => {
  it("uses a per-type icon rather than the card-sized Wireframe", () => {
    // A wireframe in a 20px row is what produced the blobs.
    const cardStart = blocks.indexOf("function PaletteCard(")
    const cardEnd = blocks.indexOf("\nexport type BlocksPanelProps")
    const card = blocks.slice(cardStart, cardEnd)
    expect(card).not.toContain("<Wireframe")
    expect(card).toContain("BLOCK_ICONS[block.type]")
  })

  it("maps every block type to an icon, so none falls back", () => {
    for (const type of ["text", "email", "password", "tel", "url", "number", "date", "textarea", "select", "checkbox"]) {
      expect(blocks, `no icon mapped for "${type}"`).toMatch(new RegExp(`\\b${type}:\\s*\\w`))
    }
  })

  it("still exports Wireframe, which the template cards use", () => {
    expect(blocks).toContain("export function Wireframe")
  })
})
