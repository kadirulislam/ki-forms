import type { KiTheme } from "./types"

export type { KiTheme }

export const defaultTheme: Required<KiTheme> = {
  accentColor: "#6366f1",
  borderColor: "#d1d5db",
  errorColor: "#dc2626",
  helperColor: "#6b7280",
  radius: "6px",
  surfaceColor: "#ffffff",
  textColor: "#111827",
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}

const cssVarMap: Record<keyof KiTheme, string> = {
  accentColor: "--ki-accent",
  borderColor: "--ki-border",
  errorColor: "--ki-error",
  helperColor: "--ki-helper",
  radius: "--ki-radius",
  surfaceColor: "--ki-surface",
  textColor: "--ki-text",
  fontFamily: "--ki-font",
}

/** Merge a partial theme over the defaults and emit CSS custom properties. */
export function themeToCssVars(theme?: KiTheme): Record<string, string> {
  const merged = { ...defaultTheme, ...theme }
  const style: Record<string, string> = {}
  for (const key of Object.keys(cssVarMap) as (keyof KiTheme)[]) {
    style[cssVarMap[key]] = merged[key]
  }
  return style
}
