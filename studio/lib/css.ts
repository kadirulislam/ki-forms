/**
 * Document-level custom CSS for Schema Studio (2.5.0).
 *
 * The ki-forms runtime never injects CSS — custom CSS lives in the Studio
 * document, previews scoped under `[data-ki-preview="studio"]`, and exports
 * as a separate artifact the consuming app owns.
 */

/** Scope value shared by the canvas preview, PreviewOverlay, and the exported note. */
export const PREVIEW_SCOPE_VALUE = "studio"

/** Hard cap so share links and storage stay small. */
export const MAX_CUSTOM_CSS = 20000

export function scopeSelector(selector: string): string {
  return `[data-ki-preview="${PREVIEW_SCOPE_VALUE}"] ${selector}`
}

function isWs(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r" || ch === "\f"
}

/** Split on a delimiter, ignoring delimiters inside (), [], and quotes. */
function splitTopLevel(input: string, delimiter: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let current = ""
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      current += ch
      if (ch === quote && input[i - 1] !== "\\") quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
      continue
    }
    if (ch === "(" || ch === "[") depth++
    else if ((ch === ")" || ch === "]") && depth > 0) depth--
    if (ch === delimiter && depth === 0) {
      parts.push(current)
      current = ""
      continue
    }
    current += ch
  }
  parts.push(current)
  return parts
}

/** At-rules whose inner content is nested style rules (safe to scope recursively). */
function isNestedRuleAtRule(prelude: string): boolean {
  const name = prelude.trim().split(/[\s(]/, 1)[0].toLowerCase()
  return name === "@media" || name === "@supports" || name === "@container" || name === "@layer"
}

/** Find the index of the `}` matching the `{` at `open`. -1 when unbalanced. */
function matchBrace(src: string, open: number): number {
  let depth = 0
  let quote: string | null = null
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (ch === quote && src[i - 1] !== "\\") quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function scopeBlock(src: string): string {
  let out = ""
  let i = 0
  const n = src.length
  while (i < n) {
    while (i < n && (isWs(src[i]) || src[i] === ";")) i++
    if (i >= n) break
    // Read the prelude up to `{`, `}`, or a statement `;` (@import etc.).
    let j = i
    let stmtEnd = -1
    while (j < n && src[j] !== "{" && src[j] !== "}") {
      if (src[j] === ";") {
        stmtEnd = j
        break
      }
      j++
    }
    if (stmtEnd !== -1) {
      // Statement at-rule without a block — copy through untouched.
      out += src.slice(i, stmtEnd + 1) + "\n"
      i = stmtEnd + 1
      continue
    }
    if (j >= n || src[j] === "}") {
      i = j + 1
      continue
    }
    const prelude = src.slice(i, j).trim()
    const close = matchBrace(src, j)
    if (close === -1) {
      // Unbalanced input — keep the remainder so nothing is silently dropped.
      out += src.slice(i)
      break
    }
    const inner = src.slice(j + 1, close)
    if (prelude.startsWith("@")) {
      out += isNestedRuleAtRule(prelude) ? `${prelude} {\n${scopeBlock(inner)}}\n` : `${prelude} {${inner}}\n`
    } else if (prelude !== "") {
      const scoped = splitTopLevel(prelude, ",")
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(scopeSelector)
        .join(", ")
      if (scoped !== "") out += `${scoped} { ${inner.trim()} }\n`
    }
    i = close + 1
  }
  return out
}

/**
 * Scope user CSS under the preview attribute so it can never leak into
 * Studio chrome. Comments are stripped; @keyframes/@font-face pass through
 * untouched; @media/@supports/@container recurse.
 */
export function scopeCustomCss(css: string): string {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "")
  if (stripped.trim() === "") return ""
  return scopeBlock(stripped).trim()
}

export type CssValidation = { ok: true } | { ok: false; error: string }

/** Guard the document field: size cap + HTML-breakout rejection. Never applied when invalid. */
export function validateCustomCss(css: unknown): CssValidation {
  if (css === undefined) return { ok: true }
  if (typeof css !== "string") return { ok: false, error: "Custom CSS must be a string" }
  if (css.length > MAX_CUSTOM_CSS) {
    return { ok: false, error: `Custom CSS exceeds the ${MAX_CUSTOM_CSS}-character limit` }
  }
  if (/<\/style/i.test(css) || /<\/script/i.test(css)) {
    return { ok: false, error: "Custom CSS must not contain </style> or </script>" }
  }
  if (/<!--/.test(css)) {
    return { ok: false, error: "Custom CSS must not contain HTML comments" }
  }
  return { ok: true }
}
