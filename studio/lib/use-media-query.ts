import { useEffect, useState } from "react"

export type MediaQuery = "xl" | "lg" | "md"

const QUERIES: Record<MediaQuery, string> = {
  xl: "(min-width: 80rem)",
  lg: "(min-width: 64rem)",
  md: "(min-width: 48rem)",
}

/** SSR/test-safe matchMedia hook. jsdom always reports false (desktop fallback). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    try {
      return window.matchMedia(query).matches
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      const mql = window.matchMedia(query)
      const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
      setMatches(mql.matches)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    } catch {
      return undefined
    }
  }, [query])

  return matches
}

export function useMinWidth(key: MediaQuery): boolean {
  return useMediaQuery(QUERIES[key])
}
