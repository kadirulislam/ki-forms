import type { KiFormDocument } from "../types"

/**
 * Shareable schema links (2.5.0).
 *
 * A whole form travels in the URL *fragment*, which browsers never send to a
 * server. That is what lets ki-forms offer sharing with no account, no backend,
 * and no privacy caveat — and it fits the project's "portable JSON, you own the
 * code" positioning rather than working against it.
 *
 * Encoding: JSON -> UTF-8 -> deflate-raw -> base64url. CompressionStream is
 * native in browsers and Node 20+, so this adds no dependency.
 *
 * Deliberately NOT tolerant: a decoded payload is untrusted input and must go
 * through the canonical validator (`parseDocumentImportAll` in the Studio) before
 * it reaches a document. This module only moves bytes.
 */

/** Bumped when the payload format changes incompatibly. */
export const SHARE_VERSION = "v1" as const

/** Fragment key, so a link is recognisable and cannot collide with other hashes. */
export const SHARE_KEY = "ki"

const PREFIX = `${SHARE_KEY}=${SHARE_VERSION}.`

/**
 * Guard against absurd payloads. A realistic 10-field form compresses to well
 * under 1kB; 8kB of base64 is far beyond any sane form and would produce a
 * link that gets truncated by chat clients and bug trackers alike.
 */
export const MAX_SHARE_LENGTH = 8000

export type ShareError = { ok: false; error: string }
export type ShareOk = { ok: true; payload: string }
export type ShareResult = ShareOk | ShareError

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function pipeThrough(bytes: Uint8Array, stream: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const writer = stream.writable.getWriter()
  void writer.write(bytes)
  void writer.close()
  const chunks: Uint8Array[] = []
  const reader = stream.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  let total = 0
  for (const chunk of chunks) total += chunk.length
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function requireCompression(): void {
  if (typeof CompressionStream === "undefined" || typeof DecompressionStream === "undefined") {
    throw new Error(
      "Share links need CompressionStream (Chrome 80+, Safari 16.4+, Firefox 113+, Node 20+).",
    )
  }
}

/**
 * Encode a document into a fragment payload, e.g. `ki=v1.eNyrVspJ…`.
 * Returns the payload rather than a full URL so the caller decides the origin.
 */
export async function encodeSharePayload(doc: KiFormDocument): Promise<ShareResult> {
  try {
    requireCompression()
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }

  try {
    const json = JSON.stringify(doc)
    const compressed = await pipeThrough(
      new TextEncoder().encode(json),
      new CompressionStream("deflate-raw") as TransformStream<Uint8Array, Uint8Array>,
    )
    const payload = PREFIX + bytesToBase64Url(compressed)
    if (payload.length > MAX_SHARE_LENGTH) {
      return {
        ok: false,
        error: `Form is too large to share (${payload.length} of ${MAX_SHARE_LENGTH} characters). Remove custom CSS or long helper text.`,
      }
    }
    return { ok: true, payload }
  } catch (error) {
    return { ok: false, error: `Could not encode this form: ${(error as Error).message}` }
  }
}

/** Extract a share payload from a fragment, or null when the hash is not one. */
export function readSharePayload(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw.startsWith(PREFIX)) return null
  return raw
}

/** Decode a fragment payload back into untrusted, unvalidated JSON. */
export async function decodeSharePayload(payload: string): Promise<{ ok: true; doc: unknown } | ShareError> {
  if (!payload.startsWith(PREFIX)) {
    return { ok: false, error: `Not a ki-forms share link (expected a "${PREFIX}" prefix).` }
  }
  const body = payload.slice(PREFIX.length)
  if (body === "") return { ok: false, error: "Share link is empty." }

  try {
    requireCompression()
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }

  try {
    const decompressed = await pipeThrough(
      base64UrlToBytes(body),
      new DecompressionStream("deflate-raw") as TransformStream<Uint8Array, Uint8Array>,
    )
    return { ok: true, doc: JSON.parse(new TextDecoder().decode(decompressed)) }
  } catch (error) {
    // Corrupt, truncated, or hand-edited link. Never surface the raw exception.
    return { ok: false, error: "This share link is damaged or incomplete." }
  }
}

/** Build the full shareable URL for a document. */
export async function buildShareUrl(doc: KiFormDocument, origin: string, pathname: string): Promise<ShareResult> {
  const encoded = await encodeSharePayload(doc)
  if (!encoded.ok) return encoded
  return { ok: true, payload: `${origin}${pathname}#${encoded.payload}` }
}
