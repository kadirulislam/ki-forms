import type { Field, FieldType } from "../../src/types"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Switch } from "./ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Separator } from "./ui/separator"
import { Button } from "./ui/button"
import { Copy, Trash2 } from "lucide-react"

export type InspectorProps = {
  field: Field
  otherFields: Field[]
  onChange: (patch: Partial<Field>) => void
  onDuplicate?: () => void
  onDelete?: () => void
}

const TYPES: FieldType[] = [
  "text",
  "email",
  "tel",
  "url",
  "number",
  "password",
  "textarea",
  "select",
  "checkbox",
  "date",
]

function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function CheckRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

export function Inspector({ field, otherFields, onChange, onDuplicate, onDelete }: InspectorProps) {
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
    <div className="flex flex-col gap-4 p-3">
      <Row label="Name" htmlFor="inspector-name">
        <Input id="inspector-name" value={field.name} onChange={(e) => onChange({ name: e.target.value })} onBlur={commitName} className="h-8 font-mono text-xs" />
      </Row>

      <Row label="Type">
        <Select value={field.type || "text"} onValueChange={(v) => setType(v as FieldType)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      {field.type === "select" && (
        <Row label="Options (one per line)">
          <textarea
            rows={4}
            className="flex w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-studio-accent focus-visible:ring-studio-accent/30 focus-visible:ring-[3px]"
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
        </Row>
      )}

      {!hideLabel && (
        <Row label="Label" htmlFor="inspector-label">
          <Input
            id="inspector-label"
            value={labelText}
            placeholder="(auto from name)"
            onChange={(e) => onChange({ label: e.target.value })}
            className="h-8"
          />
        </Row>
      )}

      <CheckRow label="Hide label" checked={hideLabel} onCheckedChange={(v) => onChange({ label: v ? false : undefined })} />

      <Row label="Placeholder" htmlFor="inspector-placeholder">
        <Input id="inspector-placeholder" value={field.placeholder || ""} onChange={(e) => onChange({ placeholder: e.target.value })} className="h-8" />
      </Row>

      <Row label="Helper text" htmlFor="inspector-helper">
        <Input id="inspector-helper" value={field.helperText || ""} onChange={(e) => onChange({ helperText: e.target.value })} className="h-8" />
      </Row>

      <CheckRow label="Required" checked={!!field.required} onCheckedChange={(v) => onChange({ required: v })} />

      <Separator />

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Show only if</Label>
        <div className="flex flex-col gap-1.5">
          <Select
            value={field.showIf?.field || ""}
            onValueChange={(v) =>
              onChange({
                showIf: v === "" ? undefined : { field: v, equals: "" },
              })
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="(always visible)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">(always visible)</SelectItem>
              {otherFields.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.showIf?.field && (
            <>
              <Select
                value={field.showIf.equals !== undefined ? "equals" : "notEquals"}
                onValueChange={(v) =>
                  onChange({
                    showIf: {
                      field: field.showIf!.field!,
                      ...(v === "equals"
                        ? { equals: field.showIf!.notEquals }
                        : { notEquals: field.showIf!.equals }),
                    },
                  })
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">equals</SelectItem>
                  <SelectItem value="notEquals">not equals</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="value"
                className="h-8"
                value={
                  field.showIf.equals !== undefined ? String(field.showIf.equals) : String(field.showIf.notEquals)
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
        <p className="text-[11px] text-muted-foreground">AND/OR groups can be edited in the JSON tab.</p>
      </div>

      <Separator />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onDuplicate}>
          <Copy /> Duplicate
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-destructive hover:bg-destructive hover:text-white"
          onClick={onDelete}
        >
          <Trash2 /> Delete
        </Button>
      </div>
    </div>
  )
}
