import type { Condition, Field, FieldType, ShowIf } from "../../src/types"
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

      <ConditionEditor field={field} otherFields={otherFields} onChange={onChange} />

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

type ConditionMode = "always" | "single" | "all" | "any"

function getMode(showIf: ShowIf | undefined): ConditionMode {
  if (!showIf) return "always"
  if (showIf.any) return "any"
  if (showIf.all) return "all"
  return "single"
}

function singleOf(showIf: ShowIf | undefined): Condition | undefined {
  if (!showIf?.field) return undefined
  return showIf.equals !== undefined
    ? { field: showIf.field, equals: showIf.equals }
    : { field: showIf.field, notEquals: showIf.notEquals }
}

function describeValue(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : String(value)
}

function summarize(showIf: ShowIf | undefined): string | null {
  if (!showIf) return null
  const parts: string[] = []
  const single = singleOf(showIf)
  if (single) {
    parts.push(
      single.equals !== undefined
        ? `${single.field} === ${describeValue(single.equals)}`
        : `${single.field} !== ${describeValue(single.notEquals)}`,
    )
  }
  const group = (conditions: Condition[], joiner: string) =>
    conditions
      .map((c) =>
        c.equals !== undefined
          ? `${c.field} === ${describeValue(c.equals)}`
          : `${c.field} !== ${describeValue(c.notEquals)}`,
      )
      .join(` ${joiner} `)
  if (showIf.all) parts.push(showIf.all.length > 1 ? `(${group(showIf.all, "AND")})` : group(showIf.all, "AND"))
  if (showIf.any) parts.push(showIf.any.length > 1 ? `(${group(showIf.any, "OR")})` : group(showIf.any, "OR"))
  return parts.length > 0 ? parts.join(" AND ") : null
}

function ConditionRow({
  condition,
  selfName,
  knownNames,
  otherFields,
  onPatch,
  onRemove,
  canRemove,
}: {
  condition: Condition
  selfName: string
  knownNames: Set<string>
  otherFields: Field[]
  onPatch: (next: Condition) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const operator = condition.equals !== undefined ? "equals" : "notEquals"
  const missing = !knownNames.has(condition.field)
  const circular = condition.field === selfName
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border/60 p-2">
      <div className="flex gap-1.5">
        <Select value={condition.field} onValueChange={(v) => onPatch({ ...condition, field: v })}>
          <SelectTrigger className="h-8 flex-1">
            <SelectValue placeholder="field" />
          </SelectTrigger>
          <SelectContent>
            {missing && (
              <SelectItem value={condition.field}>
                {condition.field} (missing)
              </SelectItem>
            )}
            {otherFields.map((f) => (
              <SelectItem key={f.name} value={f.name}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canRemove && (
          <Button variant="ghost" size="sm" aria-label="Remove condition" onClick={onRemove} className="h-8 px-2">
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="flex gap-1.5">
        <Select
          value={operator}
          onValueChange={(v) =>
            onPatch(
              v === "equals"
                ? { field: condition.field, equals: condition.notEquals ?? "" }
                : { field: condition.field, notEquals: condition.equals ?? "" },
            )
          }
        >
          <SelectTrigger className="h-8 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">equals</SelectItem>
            <SelectItem value="notEquals">not equals</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="value"
          className="h-8 flex-1"
          value={operator === "equals" ? String(condition.equals ?? "") : String(condition.notEquals ?? "")}
          onChange={(e) =>
            onPatch(
              operator === "equals"
                ? { field: condition.field, equals: e.target.value }
                : { field: condition.field, notEquals: e.target.value },
            )
          }
        />
      </div>
      {circular && (
        <p className="text-[11px] text-destructive">Depends on itself — this condition can never match.</p>
      )}
      {!circular && missing && (
        <p className="text-[11px] text-destructive">Unknown field — the condition never matches until the field exists.</p>
      )}
    </div>
  )
}

function ConditionEditor({
  field,
  otherFields,
  onChange,
}: {
  field: Field
  otherFields: Field[]
  onChange: (patch: Partial<Field>) => void
}) {
  const showIf = field.showIf
  const mode = getMode(showIf)
  const knownNames = new Set(otherFields.map((f) => f.name))
  const summary = summarize(showIf)
  const blankField = otherFields[0]?.name ?? ""

  const setMode = (next: ConditionMode) => {
    if (next === "always") {
      onChange({ showIf: undefined })
      return
    }
    const single = singleOf(showIf)
    const first: Condition = single ?? { field: blankField, equals: "" }
    if (next === "single") {
      onChange({ showIf: { field: first.field, ...(first.equals !== undefined ? { equals: first.equals } : { notEquals: first.notEquals }) } })
      return
    }
    const existing = next === "all" ? (showIf?.all ?? []) : (showIf?.any ?? [])
    const seed = existing.length > 0 ? existing : [first]
    // A top-level single condition is preserved alongside the group (combined via AND).
    const top = single
      ? { field: single.field, ...(single.equals !== undefined ? { equals: single.equals } : { notEquals: single.notEquals }) }
      : {}
    onChange(next === "all" ? { showIf: { ...top, all: seed } } : { showIf: { ...top, any: seed } })
  }

  const asSingle = (condition: Condition | undefined): ShowIf | undefined => {
    if (!condition) return undefined
    return {
      field: condition.field,
      ...(condition.equals !== undefined ? { equals: condition.equals } : { notEquals: condition.notEquals }),
    }
  }

  const patchGroup = (key: "all" | "any", next: Condition[]) => {
    if (next.length === 0) {
      onChange({ showIf: asSingle(singleOf(showIf)) })
      return
    }
    const single = singleOf(showIf)
    onChange({
      showIf: {
        ...(single ? { field: single.field, ...(single.equals !== undefined ? { equals: single.equals } : { notEquals: single.notEquals }) } : {}),
        [key]: next,
      },
    })
  }

  const group = mode === "all" ? (showIf?.all ?? []) : (showIf?.any ?? [])

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Show only if</Label>
      <Select value={mode} onValueChange={(v) => setMode(v as ConditionMode)}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="always">(always visible)</SelectItem>
          <SelectItem value="single">Single condition</SelectItem>
          <SelectItem value="all">All of these (AND)</SelectItem>
          <SelectItem value="any">Any of these (OR)</SelectItem>
        </SelectContent>
      </Select>

      {mode === "single" && (
        <ConditionRow
          condition={singleOf(showIf) ?? { field: blankField, equals: "" }}
          selfName={field.name}
          knownNames={knownNames}
          otherFields={otherFields}
          canRemove={false}
          onRemove={() => {}}
          onPatch={(next) => onChange({ showIf: { field: next.field, ...(next.equals !== undefined ? { equals: next.equals } : { notEquals: next.notEquals }) } })}
        />
      )}

      {(mode === "all" || mode === "any") && (
        <div className="flex flex-col gap-1.5">
          {group.map((condition, i) => (
            <ConditionRow
              key={i}
              condition={condition}
              selfName={field.name}
              knownNames={knownNames}
              otherFields={otherFields}
              canRemove={group.length > 1}
              onRemove={() => patchGroup(mode, group.filter((_, j) => j !== i))}
              onPatch={(next) => patchGroup(mode, group.map((c, j) => (j === i ? next : c)))}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={blankField === "" && group.length > 0}
            onClick={() => patchGroup(mode, [...group, { field: blankField, equals: "" }])}
          >
            + Add condition
          </Button>
        </div>
      )}

      {summary && <p className="font-mono text-[11px] text-muted-foreground">Visible when: {summary}</p>}
    </div>
  )
}
