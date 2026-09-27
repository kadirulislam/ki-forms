// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  encodeSharePayload,
  decodeSharePayload,
  readSharePayload,
  buildShareUrl,
  MAX_SHARE_LENGTH,
  SHARE_KEY,
} from "../src/share/codec"
import { validateDocument } from "../src/schema/validate"
import type { KiFormDocument } from "../src/types"

/**
 * Share-link codec.
 *
 * Runs in the node environment deliberately: jsdom does not implement
 * CompressionStream, so a stubbed test here would prove nothing about whether
 * the encoding actually round-trips.
 */

const doc: KiFormDocument = {
  version: 1,
  name: "Waitlist",
  fields: [
    { name: "email", type: "email", required: true, helperText: "We will only use this to notify you" },
    { name: "source", type: "select", options: ["Twitter / X", "GitHub", "A friend", "Other"] },
  ],
  variant: "classic",
}

describe("share link encoding", () => {
  it("round-trips a document exactly", async () => {
    const encoded = await encodeSharePayload(doc)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = await decodeSharePayload(encoded.payload)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.doc).toEqual(doc)
  })

  it("produces a versioned, recognisable fragment", async () => {
    const encoded = await encodeSharePayload(doc)
    if (!encoded.ok) throw new Error(encoded.error)
    expect(encoded.payload.startsWith(`${SHARE_KEY}=v1.`)).toBe(true)
    // The body is base64url only — no +, /, or = padding — so nothing in it
    // needs URL escaping. (The prefix's own "=" is deliberate and safe.)
    const body = encoded.payload.slice(`${SHARE_KEY}=v1.`.length)
    expect(body).not.toMatch(/[+/=]/)
  })

  it("compresses: a repetitive document stays well under its JSON size", async () => {
    const big: KiFormDocument = {
      version: 1,
      fields: Array.from({ length: 30 }, (_, i) => ({ name: `field${i}`, type: "text", required: true })),
    }
    const encoded = await encodeSharePayload(big)
    if (!encoded.ok) throw new Error(encoded.error)
    expect(encoded.payload.length).toBeLessThan(JSON.stringify(big).length)
  })

  it("round-trips an empty form and a form with custom CSS", async () => {
    for (const candidate of [
      { version: 1, fields: [] } as KiFormDocument,
      { version: 1, fields: [{ name: "a" }], customCss: ".x { color: red }" } as unknown as KiFormDocument,
      { version: 1, fields: [{ name: "a" }], theme: { accentColor: "#ff0000" }, variant: "conversational" } as KiFormDocument,
    ]) {
      const encoded = await encodeSharePayload(candidate)
      if (!encoded.ok) throw new Error(encoded.error)
      const decoded = await decodeSharePayload(encoded.payload)
      if (!decoded.ok) throw new Error(decoded.error)
      expect(decoded.doc).toEqual(candidate)
    }
  })

  it("handles non-ASCII text", async () => {
    const unicode: KiFormDocument = { version: 1, fields: [{ name: "city", label: "Città — 東京 🌍" }] }
    const encoded = await encodeSharePayload(unicode)
    if (!encoded.ok) throw new Error(encoded.error)
    const decoded = await decodeSharePayload(encoded.payload)
    if (!decoded.ok) throw new Error(decoded.error)
    expect(decoded.doc).toEqual(unicode)
  })
})

describe("share link reading", () => {
  it("recognises a payload in a hash, with or without the leading #", async () => {
    const encoded = await encodeSharePayload(doc)
    if (!encoded.ok) throw new Error(encoded.error)
    expect(readSharePayload(`#${encoded.payload}`)).toBe(encoded.payload)
    expect(readSharePayload(encoded.payload)).toBe(encoded.payload)
  })

  it("ignores hashes that are not share links", () => {
    expect(readSharePayload("#/docs/cli")).toBeNull()
    expect(readSharePayload("#section-2")).toBeNull()
    expect(readSharePayload("")).toBeNull()
    // Right key, wrong version.
    expect(readSharePayload(`#${SHARE_KEY}=v9.abc`)).toBeNull()
  })

  it("rejects a damaged link without leaking the raw exception", async () => {
    const result = await decodeSharePayload(`${SHARE_KEY}=v1.not-valid-deflate`)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe("This share link is damaged or incomplete.")
  })

  it("rejects an empty or foreign payload", async () => {
    const empty = await decodeSharePayload(`${SHARE_KEY}=v1.`)
    expect(empty.ok).toBe(false)
    const foreign = await decodeSharePayload("some-other-app=1.abc")
    expect(foreign.ok).toBe(false)
    if (!foreign.ok) expect(foreign.error).toContain("Not a ki-forms share link")
  })

  it("refuses a document beyond the size guard", async () => {
    // High-entropy text, so deflate cannot shrink it away. (A document of
    // repeated characters compresses to almost nothing and would not trip the
    // guard, which is the guard working correctly rather than failing.)
    let seed = 12345
    const noise = (length: number) => {
      let out = ""
      for (let i = 0; i < length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        out += String.fromCharCode(33 + (seed % 90))
      }
      return out
    }
    const huge: KiFormDocument = {
      version: 1,
      fields: Array.from({ length: 200 }, (_, i) => ({
        name: `field${i}`,
        type: "text",
        helperText: noise(300),
      })),
    }
    const encoded = await encodeSharePayload(huge)
    expect(encoded.ok).toBe(false)
    if (encoded.ok) return
    expect(encoded.error).toContain("too large")
  })
})

describe("share links are not a validation bypass", () => {
  it("a decoded payload is untrusted and must still pass the validator", async () => {
    // The codec deliberately does NOT validate. This test pins that contract:
    // anything that decoded successfully is still just `unknown`.
    const hostile = { version: 1, fields: [{ name: "a", type: "not-a-real-type" }] }
    const encoded = await encodeSharePayload(hostile as unknown as KiFormDocument)
    if (!encoded.ok) throw new Error(encoded.error)
    const decoded = await decodeSharePayload(encoded.payload)
    if (!decoded.ok) throw new Error(decoded.error)
    expect(decoded.doc).toEqual(hostile)
    // The canonical validator is what rejects it.
    expect(validateDocument(decoded.doc).success).toBe(false)
  })
})

describe("buildShareUrl", () => {
  it("composes origin, path, and fragment", async () => {
    const result = await buildShareUrl(doc, "https://kadirulislam.github.io", "/ki-forms/studio/")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.startsWith("https://kadirulislam.github.io/ki-forms/studio/#ki=v1.")).toBe(true)
  })

  it("stays under the size guard for a realistic form", async () => {
    const result = await buildShareUrl(doc, "https://example.com", "/studio/")
    if (!result.ok) throw new Error(result.error)
    expect(result.payload.length).toBeLessThan(MAX_SHARE_LENGTH)
  })
})
