// @vitest-environment node
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * The launch badges must be in the *served* document, not in the React tree.
 *
 * Both ki-forms surfaces are React shells around an empty
 * `<div id="root">`, so a badge rendered in JSX exists only after hydration —
 * invisible to `curl`, to a crawler, and to any check that reads the HTML the
 * server hands back. These tests read each `index.html` as text and assert
 * exactly that, so a future refactor that helpfully "moves it into the app"
 * fails here instead of silently dropping the do-follow link.
 *
 * The same assertions run against both pages, because "the badge is in the
 * markup" is a shared contract and drift between the two copies is the bug
 * worth catching.
 */

const STARTUPWIKI_ANCHOR =
  '<a href="https://startupwiki.tech/launch" target="_blank" rel="noopener"><img src="https://startupwiki.tech/badges/featured-on-startupwiki.svg" alt="Featured on StartupWiki" width="240" height="56" /></a>'

const PRODUCT_HUNT_ANCHOR =
  '<a href="https://www.producthunt.com/products/ki-forms-studio?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-ki-forms-studio" target="_blank" rel="noopener noreferrer"><img alt="Ki Forms Studio - Visual form builder. Exports real React, Zod, and JSON. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1260162&amp;theme=light&amp;t=1790685314197"></a>'

/** Each page: its HTML, the component that relocates the badges, and the
 *  class its badge wrapper carries. */
const PAGES = [
  {
    name: "studio",
    html: readFileSync(fileURLToPath(new URL("../studio/index.html", import.meta.url)), "utf8"),
    component: readFileSync(fileURLToPath(new URL("../studio/App.tsx", import.meta.url)), "utf8"),
    wrapperClass: "ki-launch-bar",
  },
  {
    name: "docs",
    html: readFileSync(fileURLToPath(new URL("../website/index.html", import.meta.url)), "utf8"),
    component: readFileSync(fileURLToPath(new URL("../website/main.tsx", import.meta.url)), "utf8"),
    wrapperClass: "launch-badges",
  },
]

describe.each(PAGES)("launch badges on the $name page", ({ html, component, wrapperClass }) => {
  it("serves both badges as static HTML, not React-rendered markup", () => {
    expect(html).toContain(STARTUPWIKI_ANCHOR)
    expect(html).toContain(PRODUCT_HUNT_ANCHOR)
  })

  it("keeps both badges outside the React mount point, so they render with JS off", () => {
    // Everything inside `<div id="root">` is replaced at runtime, so a badge in
    // there is only in the DOM after hydration. Anchor on the *element*, not
    // the bare id: the string `<div id="root">` also occurs in the explanatory
    // comment in the <style> block, and slicing from there cuts the real badges
    // out of the "outside" string.
    const rootStart = html.indexOf('<div id="root">', html.indexOf("<body"))
    expect(rootStart, "missing #root mount point").toBeGreaterThan(-1)

    const badgeStart = html.search(new RegExp(`<div class="${wrapperClass}" id="[^"]+">`))
    expect(badgeStart, "missing the static badge block").toBeGreaterThan(-1)

    // Sibling of #root, not a descendant: the badge index is before it, and the
    // badge block is closed before the root div opens.
    expect(badgeStart).toBeLessThan(rootStart)
  })

  it("keeps the StartupWiki link do-follow and pointed at the launch page", () => {
    const anchor = html.slice(html.indexOf('<a href="https://startupwiki.tech/launch"'))
    const tag = anchor.slice(0, anchor.indexOf("</a>"))

    // Do-follow is the whole point of the embed. `noopener` is fine — it is a
    // security attribute, not a crawl directive.
    expect(tag).not.toContain("nofollow")
    expect(tag).not.toContain("ugc")
    expect(tag).not.toContain("sponsored")
    expect(tag).toContain('href="https://startupwiki.tech/launch"')
    expect(tag).toContain('rel="noopener"')
    expect(tag).toContain('target="_blank"')
    expect(tag).toContain('alt="Featured on StartupWiki"')
  })

  it("keeps the Product Hunt link pointed at the ki-forms-studio product", () => {
    const anchor = html.slice(html.indexOf("<a href=\"https://www.producthunt.com/products/ki-forms-studio"))
    const tag = anchor.slice(0, anchor.indexOf("</a>"))

    expect(tag).not.toContain("nofollow")
    expect(tag).not.toContain("ugc")
    expect(tag).toContain("post_id=1260162")
    // The query string is HTML-escaped in the source, which is what makes the
    // `&` survive as a separator rather than starting a character reference.
    expect(tag).toContain("&amp;utm_source=badge-featured")
  })

  it("carries no crawl-directive tokens anywhere on the page", () => {
    // Not just on the anchors: the comment above them used to spell these out,
    // and a naive grep of the served page would read that as the badges being
    // tagged. The wording of the comment is part of the contract.
    expect(html).not.toContain("nofollow")
    expect(html).not.toContain("rel=\"ugc\"")
  })

  it("reserves viewport space for the badges so they cannot be pushed off-screen", () => {
    // The body is a flex column, so #root fills what is left and the static
    // block has somewhere to live. Without this a full-height app would
    // displace it entirely.
    expect(html).toContain("display: flex")
    expect(html).toContain("flex-direction: column")
    const badgeTag = new RegExp(`<div class="${wrapperClass}" id="[^"]+">`)
    expect(badgeTag.test(html), "badge block lost its id or wrapper class").toBe(true)
    // Order is asserted against the real elements, not the first textual
    // mention of either class — see the mount-point test above.
    const rootStart = html.indexOf('<div id="root">', html.indexOf("<body"))
    expect(html.search(badgeTag)).toBeLessThan(rootStart)
  })

  it("uses the same id the app relocates the badges by", () => {
    // The markup is moved into the header by id, so `BADGES_ID` in the app and
    // this attribute have to agree. Read the component rather than restating
    // the constant: a hardcoded copy here would pass even after someone renamed
    // one side, which is the bug this exists to catch.
    const declared = component.match(/const BADGES_ID = "([^"]+)"/)
    expect(declared, "the app no longer declares BADGES_ID").toBeTruthy()

    const inMarkup = html.match(new RegExp(`<div class="${wrapperClass}" id="([^"]+)">`))
    expect(inMarkup, "the badge block lost its id").toBeTruthy()

    expect(inMarkup?.[1]).toBe(declared?.[1])
  })

  it("keeps both pages' badge markup identical", () => {
    // Two hand-maintained copies of the same embed is exactly the setup where
    // one drifts. The anchors themselves are asserted equal.
    for (const anchor of [STARTUPWIKI_ANCHOR, PRODUCT_HUNT_ANCHOR]) {
      expect(html).toContain(anchor)
    }
  })
})
