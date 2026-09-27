import type { Field, FieldType } from "../../src/types"
import {
  ArrowDown,
  ArrowUp,
  Check,
  Clipboard,
  Columns2,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  Rows3,
  Trash2,
  Type,
} from "lucide-react"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "./ui/context-menu"
import { BLOCK_TYPE_LABELS } from "./BlocksPanel"

/**
 * The field context menu.
 *
 * The shape follows the affordance drag-and-drop editors use: the actions that
 * apply *to this field's current state* come first, with a submenu wherever the
 * choice is one of several values, then the structural actions, and destructive
 * ones last behind a separator.
 *
 * Everything here writes through `onPatch`, the same `patchField` the Inspector
 * uses, so a change made by right-click and a change made in the side panel are
 * literally the same code path and the same undo entry.
 */

/** Order here is the order in the menu. Reusing the Blocks palette's labels. */
const TYPE_ORDER: FieldType[] = [
  "text",
  "email",
  "password",
  "tel",
  "url",
  "number",
  "date",
  "select",
  "textarea",
  "checkbox",
]

export type FieldContextMenuProps = {
  field: Field
  index: number
  total: number
  allFields: Field[]
  onPatch: (patch: Partial<Field>) => void
  onMove: (delta: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
  onCopyName: () => void
}

export function FieldContextMenuContent({
  field,
  index,
  total,
  allFields,
  onPatch,
  onMove,
  onDuplicate,
  onDelete,
  onCopyName,
}: FieldContextMenuProps) {
  const currentType = (field.type ?? "text") as FieldType
  const isRequired = field.required === true
  const labelHidden = field.label === false
  const hasCondition = field.showIf !== undefined
  // A field cannot condition on itself, so it is excluded from the list.
  const conditionTargets = allFields.filter((f) => f.name && f.name !== field.name)

  const setType = (next: FieldType) => {
    if (next === currentType) return
    // `options` only mean anything to a select. Carrying them onto a text field
    // would export as dead configuration that surprises whoever reads it later.
    if (currentType === "select" && next !== "select") {
      onPatch({ type: next, options: undefined })
      return
    }
    onPatch({ type: next })
  }

  return (
    <ContextMenuContent className="min-w-52">
      <ContextMenuLabel className="font-mono text-[11px] normal-case">{field.name || "(unnamed)"}</ContextMenuLabel>
      <ContextMenuSeparator />

      {/* ---- Context-aware: only what applies to this field right now ---- */}

      {/* A check in the leading slot, not a nested checkbox item. Nesting one
          menu item inside another gives the row two `menuitem` roles, which
          double-announces it and puts an extra stop in the arrow-key sequence.
          The empty span keeps the label aligned when it is off. */}
      <ContextMenuItem onSelect={() => onPatch({ required: !isRequired })}>
        {isRequired ? <Check /> : <span className="size-4" aria-hidden="true" />}
        Required
      </ContextMenuItem>

      {/* A checkbox carries its own label next to the box, so "hide label" is
          not a meaningful choice for it. */}
      {currentType !== "checkbox" && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            {labelHidden ? <EyeOff /> : <Eye />}
            Label
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={() => onPatch({ label: undefined })}>
              <Eye />
              Show label
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => onPatch({ label: false })}>
              <EyeOff />
              Hide label
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Columns2 />
          Width
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {/* Radio semantics: these are alternatives, not independent toggles. */}
          <ContextMenuRadioGroup
            value={field.width ?? "full"}
            onValueChange={(value) => onPatch({ width: value as "half" | "full" })}
          >
            <ContextMenuRadioItem value="full">
              <Rows3 />
              Full width
            </ContextMenuRadioItem>
            <ContextMenuRadioItem value="half">
              <Columns2 />
              Half width
            </ContextMenuRadioItem>
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>

      {conditionTargets.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <GitBranch />
            {hasCondition ? "Change condition" : "Show only when"}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {hasCondition && (
              <>
                <ContextMenuItem onSelect={() => onPatch({ showIf: undefined })}>
                  <Eye />
                  Always show
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            {conditionTargets.map((target) => (
              <ContextMenuItem key={target.name} onSelect={() => onPatch({ showIf: { field: target.name } })}>
                {BLOCK_TYPE_LABELS[target.type || "text"] ?? target.type}
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">{target.name}</span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <Type />
          Type
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuRadioGroup value={currentType} onValueChange={(value) => setType(value as FieldType)}>
            {TYPE_ORDER.map((type) => (
              <ContextMenuRadioItem key={type} value={type}>
                {BLOCK_TYPE_LABELS[type] ?? type}
              </ContextMenuRadioItem>
            ))}
          </ContextMenuRadioGroup>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuSeparator />

      {/* ---- Structural ---- */}

      <ContextMenuItem onSelect={onDuplicate}>
        <Copy />
        Duplicate field
      </ContextMenuItem>
      <ContextMenuItem onSelect={onCopyName}>
        <Clipboard />
        Copy field name
      </ContextMenuItem>
      <ContextMenuItem disabled={index === 0} onSelect={() => onMove(-1)}>
        <ArrowUp />
        Move up
      </ContextMenuItem>
      <ContextMenuItem disabled={index === total - 1} onSelect={() => onMove(1)}>
        <ArrowDown />
        Move down
      </ContextMenuItem>

      <ContextMenuSeparator />

      <ContextMenuItem variant="destructive" onSelect={onDelete}>
        <Trash2 />
        Delete field
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
