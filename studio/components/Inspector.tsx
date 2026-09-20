import type { Field, FieldType } from "../../src/types"

export type InspectorProps = {
  field: Field
  otherFields: Field[]
  onChange: (patch: Partial<Field>) => void
}

const TYPES: FieldType[] = ["text", "email", "password", "number", "textarea", "select", "checkbox"]

export function Inspector({ field, otherFields, onChange }: InspectorProps) {
  const hideLabel = field.label === false
  const labelText = hideLabel || typeof field.label !== "string" ? "" : field.label

  const setType = (next: FieldType) => {
    const patch: Partial<Field> = { type: next }
    if (next === "select") {
      patch.options = Array.isArray(field.options) && field.options.length > 0 ? field.options : ["Option 1", "Option 2"]
    } else {
      patch.options = undefined
    }
    onChange(patch)
  }

  const commitName = () => {
    if (typeof field.name === "string" && field.name.trim() === "") {
      onChange({ name: `field_${field.type || "text"}` })
    }
  }

  return (
    <aside className="st-panel st-inspector" onClick={(e) => e.stopPropagation()}>
      <div className="st-panel-title">Field settings</div>

      <label className="st-row">
        <span>Name</span>
        <input value={field.name} onChange={(e) => onChange({ name: e.target.value })} onBlur={commitName} />
      </label>

      <label className="st-row">
        <span>Type</span>
        <select value={field.type || "text"} onChange={(e) => setType(e.target.value as FieldType)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      {field.type === "select" && (
        <label className="st-row">
          <span>Options (one per line)</span>
          <textarea
            rows={4}
            value={Array.isArray(field.options) ? field.options.map((o) => (typeof o === "string" ? o : o.value)).join("\n") : ""}
            onChange={(e) =>
              onChange({
                options: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter((s) => s !== ""),
              })
            }
          />
        </label>
      )}

      {!hideLabel && (
        <label className="st-row">
          <span>Label</span>
          <input value={labelText} placeholder="(auto from name)" onChange={(e) => onChange({ label: e.target.value })} />
        </label>
      )}

      <label className="st-check">
        <input
          type="checkbox"
          checked={hideLabel}
          onChange={(e) => onChange({ label: e.target.checked ? false : undefined })}
        />
        <span>Hide label</span>
      </label>

      <label className="st-row">
        <span>Placeholder</span>
        <input value={field.placeholder || ""} onChange={(e) => onChange({ placeholder: e.target.value })} />
      </label>

      <label className="st-row">
        <span>Helper text</span>
        <input value={field.helperText || ""} onChange={(e) => onChange({ helperText: e.target.value })} />
      </label>

      <label className="st-check">
        <input type="checkbox" checked={!!field.required} onChange={(e) => onChange({ required: e.target.checked })} />
        <span>Required</span>
      </label>

      <div className="st-row st-showif">
        <span>Show only if</span>
        <div className="st-showif-controls">
          <select
            value={field.showIf?.field || ""}
            onChange={(e) =>
              onChange({
                showIf: e.target.value === "" ? undefined : { field: e.target.value, equals: "" },
              })
            }
          >
            <option value="">(always visible)</option>
            {otherFields.map((f) => (
              <option key={f.name} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          {field.showIf?.field && (
            <>
              <select
                value={field.showIf.equals !== undefined ? "equals" : "notEquals"}
                onChange={(e) =>
                  onChange({
                    showIf: {
                      field: field.showIf!.field!,
                      ...(e.target.value === "equals"
                        ? { equals: field.showIf!.notEquals }
                        : { notEquals: field.showIf!.equals }),
                    },
                  })
                }
              >
                <option value="equals">equals</option>
                <option value="notEquals">not equals</option>
              </select>
              <input
                placeholder="value"
                value={
                  field.showIf.equals !== undefined
                    ? String(field.showIf.equals)
                    : String(field.showIf.notEquals)
                }
                onChange={(e) =>
                  onChange({
                    showIf: {
                      field: field.showIf!.field!,
                      ...(field.showIf!.equals !== undefined
                        ? { equals: e.target.value }
                        : { notEquals: e.target.value }),
                    },
                  })
                }
              />
            </>
          )}
        </div>
        <p className="st-hint">AND/OR groups can be edited in the JSON tab.</p>
      </div>
    </aside>
  )
}
