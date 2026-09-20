import type { KiTheme } from "../../src/types"

export type StylePanelProps = {
  theme: KiTheme
  onChange: (theme: KiTheme) => void
}

const TOKENS: { key: keyof KiTheme; label: string; kind: "color" | "text"; fallback: string }[] = [
  { key: "accentColor", label: "Accent", kind: "color", fallback: "#6366f1" },
  { key: "textColor", label: "Text", kind: "color", fallback: "#0f172a" },
  { key: "borderColor", label: "Border", kind: "color", fallback: "#d1d5db" },
  { key: "surfaceColor", label: "Surface", kind: "color", fallback: "#ffffff" },
  { key: "errorColor", label: "Error", kind: "color", fallback: "#dc2626" },
  { key: "helperColor", label: "Helper text", kind: "color", fallback: "#6b7280" },
  { key: "radius", label: "Corner radius", kind: "text", fallback: "6px" },
  { key: "fontFamily", label: "Font family", kind: "text", fallback: "inherit" },
]

const PRESETS: { name: string; accent: string }[] = [
  { name: "Indigo", accent: "#6366f1" },
  { name: "Violet", accent: "#8b5cf6" },
  { name: "Emerald", accent: "#10b981" },
  { name: "Amber", accent: "#f59e0b" },
  { name: "Rose", accent: "#f43f5e" },
]

export function StylePanel({ theme, onChange }: StylePanelProps) {
  const setColor = (key: keyof KiTheme, value: string) => onChange({ ...theme, [key]: value })
  const clearToken = (key: keyof KiTheme) => {
    const next = { ...theme }
    delete next[key]
    onChange(next)
  }

  return (
    <div className="pb-style">
      <div className="pb-blocks-label">Accent presets</div>
      <div className="pb-presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={"pb-preset" + (theme.accentColor === p.accent ? " pb-preset-active" : "")}
            title={p.name}
            onClick={() => setColor("accentColor", p.accent)}
          >
            <span style={{ background: p.accent }} />
            {p.name}
          </button>
        ))}
      </div>

      <div className="pb-blocks-label">Theme tokens</div>
      {TOKENS.map((t) => {
        const value = theme[t.key]
        return (
          <div key={t.key} className="pb-token">
            <span className="pb-token-label">{t.label}</span>
            {t.kind === "color" ? (
              <span className="pb-token-controls">
                <input
                  type="color"
                  aria-label={`${t.label} color`}
                  value={typeof value === "string" ? value : t.fallback}
                  onChange={(e) => setColor(t.key, e.target.value)}
                />
                <input
                  type="text"
                  className="pb-token-value"
                  placeholder={t.fallback}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => setColor(t.key, e.target.value)}
                />
                {value !== undefined && (
                  <button type="button" title="Reset to default" className="pb-token-clear" onClick={() => clearToken(t.key)}>
                    ×
                  </button>
                )}
              </span>
            ) : (
              <input
                type="text"
                className="pb-token-value pb-token-text"
                placeholder={t.fallback}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => setColor(t.key, e.target.value)}
              />
            )}
          </div>
        )
      })}

      <p className="pb-style-hint">
        Tokens map to <code>--ki-*</code> CSS variables — defaults match the library, so an empty theme looks exactly
        like shipped ki-forms.
      </p>
      {Object.keys(theme).length > 0 && (
        <button type="button" className="pb-reset-theme" onClick={() => onChange({})}>
          Reset all tokens
        </button>
      )}
    </div>
  )
}
