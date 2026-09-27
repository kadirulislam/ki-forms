/// <reference types="vite/client" />
/**
 * Where the documentation lives, relative to wherever the Studio is running.
 *
 * The Studio used to carry its own copy of the docs in a modal, which meant two
 * places to keep in sync and one of them inevitably stale. It now links out to
 * the real site, so the only copy is the one that gets shipped.
 *
 * Layout on the published site: the Studio is a subdirectory of the docs app
 * (`/studio/` next to `/#/docs/*`), and the docs app is hash-routed. So the
 * docs root is the Studio's own directory with the `studio` segment removed.
 * In dev they are two separate Vite servers on different ports.
 */

export const DOCS_HASH_ROUTE = "#/docs/getting-started"

/** Dev server for the docs site (`npm run docs`); the Studio is a different port. */
export const DEV_DOCS_ORIGIN = "http://localhost:5174"

/**
 * Resolve the documentation URL.
 *
 * Pure and exported so the path arithmetic can be tested without a browser —
 * it is the part that is easy to get subtly wrong and impossible to eyeball.
 */
export function resolveDocsUrl(origin: string, pathname: string, isDev = false): string {
  if (isDev) return `${DEV_DOCS_ORIGIN}/${DOCS_HASH_ROUTE}`
  // Strip a trailing `studio/`, `studio/index.html`, or a bare `studio`, so both
  // `/ki-forms/studio/` and `/ki-forms/studio/index.html` resolve to `/ki-forms/`.
  const docsRoot = pathname.replace(/\/studio(\/index\.html)?\/?$/, "/")
  // A Studio served from the filesystem root leaves the pathname empty.
  const root = docsRoot.startsWith("/") ? docsRoot : `/${docsRoot}`
  return `${origin}${root}${DOCS_HASH_ROUTE}`
}

/** The href for the documentation, for the current environment. */
export function docsHref(): string {
  if (typeof window === "undefined") return `/${DOCS_HASH_ROUTE}`
  return resolveDocsUrl(window.location.origin, window.location.pathname, import.meta.env.DEV)
}
