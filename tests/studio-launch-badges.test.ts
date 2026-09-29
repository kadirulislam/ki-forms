// @vitest-environment node
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

/**
 * The launch badges must be in the *served* document, not in the React tree.
 *
 * A badge rendered by React is invisible to `curl`, to a crawler, and to any
 * check that reads the HTML the server hands back — it only exists once
 * JavaScript has run. These tests read `studio/index.html` as text and assert
 * exactly that, so a future refactor that helpfully "moves it into the app"
 * fails here instead of silently dropping the do-follow link.
 */

const STUDIO_HTML = fileURLToPath(new URL("../studio/index.html", import.meta.url))

const STARTUPWIKI_ANCHOR =
  '<a href="https://startupwiki.tech/launch" target="_blank" rel="noopener"><img src="https://startupwiki.tech/badges/featured-on-startupwiki.svg" alt="Featured on StartupWiki" width="240" height="56" /></a>'

const PRODUCT_HUNT_ANCHOR =
  '<a href="https://www.producthunt.com/products/ki-forms-studio?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-ki-forms-studio" target="_blank" rel="noopener noreferrer"><img alt="Ki Forms Studio - Visual form builder. Exports real React, Zod, and JSON. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1260162&amp;theme=light&amp;t=1790685314197"></a>'

const html = readFileSync(STUDIO_HTML, "utf8")

describe("studio launch badges", () => {
  it("serves both badges as static HTML, not React-rendered markup", () => {
    expect(html).toContain(STARTUPWIKI_ANCHOR)
    expect(html).toContain(PRODUCT_HUNT_ANCHOR)
  })

  it("keeps both badges outside the React mount point, so they render with JS off", () => {
    // Everything between `<div id="root">` and its close is replaced at
    // runtime. A badge inside that span is only in the DOM after hydration.
    const rootStart = html.indexOf('<div id="root">')
    expect(rootStart, "missing #root mount point").toBeGreaterThan(-1)
    const rootEnd = html.indexOf("</div>", rootStart)
    expect(rootEnd, "unterminated #root").toBeGreaterThan(rootStart)

    const outsideRoot = html.slice(0, rootStart) + html.slice(rootEnd)
    expect(outsideRoot).toContain("startupwiki.tech/launch")
    expect(outsideRoot).toContain("producthunt.com/products/ki-forms-studio")
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

  it("reserves viewport space for the bar so it cannot fall below the fold", () => {
    // The app is `h-full` now. If this regresses to a plain block body, the
    // bar renders alongside a full-height app and gets pushed off-screen.
    expect(html).toContain("display: flex")
    expect(html).toContain("flex-direction: column")
    // Compare the *tags*: `ki-launch-bar` first appears in the <style> block,
    // well above the element that actually has to come first.
    expect(html.indexOf('<div class="ki-launch-bar" id="ki-launch-badges">')).toBeLessThan(
      html.indexOf('<div id="root">'),
    )
  })

  it("uses the same id the Studio relocates the badges by", () => {
    // The markup is moved into the header by id, so `BADGES_ID` in
    // studio/App.tsx and this attribute have to agree. Read the component
    // rather than restating the constant: a hardcoded copy here would pass even
    // after someone renamed one side, which is the bug this exists to catch.
    const app = readFileSync(fileURLToPath(new URL("../studio/App.tsx", import.meta.url)), "utf8")
    const declared = app.match(/const BADGES_ID = "([^"]+)"/)
    expect(declared, "studio/App.tsx no longer declares BADGES_ID").toBeTruthy()

    const inMarkup = html.match(/<div class="ki-launch-bar" id="([^"]+)">/)
    expect(inMarkup, "the badge block lost its id").toBeTruthy()

    expect(inMarkup?.[1]).toBe(declared?.[1])
  })
})
