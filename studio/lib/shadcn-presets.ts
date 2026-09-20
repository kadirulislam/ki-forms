import type { KiTheme } from "../../src/types"

/**
 * shadcn/ui design tokens mapped onto KiTheme.
 *
 * Every preset mirrors a stock shadcn "new-york" theme (neutral base with the
 * classic colored-primary variants), so a form exported from the studio looks
 * native inside any shadcn/Tailwind app. Tokens are plain hex values — the
 * KiForm runtime only understands CSS color strings, and hex keeps exports
 * portable (no oklch() in copied code).
 */
export type ShadcnPreset = {
  id: string
  name: string
  /** Radix/shadcn primary color family this preset mirrors. */
  family: string
  light: Required<KiTheme>
  dark: Required<KiTheme>
}

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function theme(p: {
  background: string
  foreground: string
  primary: string
  primaryForeground: string
  border: string
  mutedForeground: string
  destructive: string
  radius: string
}): Required<KiTheme> {
  return {
    accentColor: p.primary,
    borderColor: p.border,
    errorColor: p.destructive,
    helperColor: p.mutedForeground,
    radius: p.radius,
    surfaceColor: p.background,
    textColor: p.foreground,
    fontFamily: FONT,
  }
}

/** Neutral surfaces + colored primary — the stock shadcn look for each family. */
const NEUTRAL = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    border: "#e5e5e5",
    mutedForeground: "#737373",
    destructive: "#ef4444",
    radius: "0.625rem",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    border: "#262626",
    mutedForeground: "#a3a3a3",
    destructive: "#ef4444",
    radius: "0.625rem",
  },
}

export const SHADCN_PRESETS: ShadcnPreset[] = [
  {
    id: "shadcn-zinc",
    name: "Zinc",
    family: "zinc",
    light: theme({ ...NEUTRAL.light, primary: "#18181b", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#fafafa", primaryForeground: "#18181b" }),
  },
  {
    id: "shadcn-red",
    name: "Red",
    family: "red",
    light: theme({ ...NEUTRAL.light, primary: "#dc2626", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#ef4444", primaryForeground: "#fafafa" }),
  },
  {
    id: "shadcn-rose",
    name: "Rose",
    family: "rose",
    light: theme({ ...NEUTRAL.light, primary: "#e11d48", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#fb7185", primaryForeground: "#0a0a0a" }),
  },
  {
    id: "shadcn-orange",
    name: "Orange",
    family: "orange",
    light: theme({ ...NEUTRAL.light, primary: "#ea580c", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#f97316", primaryForeground: "#0a0a0a" }),
  },
  {
    id: "shadcn-green",
    name: "Green",
    family: "green",
    light: theme({ ...NEUTRAL.light, primary: "#16a34a", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#4ade80", primaryForeground: "#0a0a0a" }),
  },
  {
    id: "shadcn-blue",
    name: "Blue",
    family: "blue",
    light: theme({ ...NEUTRAL.light, primary: "#2563eb", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#60a5fa", primaryForeground: "#0a0a0a" }),
  },
  {
    id: "shadcn-yellow",
    name: "Yellow",
    family: "yellow",
    light: theme({ ...NEUTRAL.light, primary: "#ca8a04", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#facc15", primaryForeground: "#0a0a0a" }),
  },
  {
    id: "shadcn-violet",
    name: "Violet",
    family: "violet",
    light: theme({ ...NEUTRAL.light, primary: "#7c3aed", primaryForeground: "#fafafa" }),
    dark: theme({ ...NEUTRAL.dark, primary: "#a78bfa", primaryForeground: "#0a0a0a" }),
  },
]

/** Look up a preset by id; returns undefined for unknown ids. */
export function getShadcnPreset(id: string): ShadcnPreset | undefined {
  return SHADCN_PRESETS.find((p) => p.id === id)
}
