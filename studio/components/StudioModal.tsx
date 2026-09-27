import { useEffect, useRef, useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { TabsTrigger } from "./ui/tabs"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"
import { Check, Copy, type LucideIcon } from "lucide-react"

/**
 * Shared Studio modal primitives (P2.4.0 foundation).
 *
 * Goals:
 * - Consistent sizing / header / footer / scroll behavior across all Studio modals.
 * - Escape closes, focus returns to the element that opened the modal.
 * - Shared copy + code editor + validation states so Docs/Code/Preview/Sheets
 *   don't each reinvent accessible patterns.
 */

export function useStudioEscape(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])
}

/** Remember the focused element on mount and restore it on unmount. */
export function useFocusRestore() {
  const prev = useRef<HTMLElement | null>(null)
  useEffect(() => {
    prev.current = document.activeElement as HTMLElement | null
    return () => {
      const el = prev.current
      if (el && typeof el.focus === "function") {
        try {
          el.focus()
        } catch {
          // non-fatal: element may be unmounted
        }
      }
    }
  }, [])
}

export type StudioModalSize = "sm" | "md" | "lg"

const SIZE_CLASSES: Record<StudioModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-3xl",
}

export type StudioModalProps = {
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  /** Hides the title/description visually but keeps them for screen readers. */
  hideHeaderText?: boolean
  size?: StudioModalSize
  children: ReactNode
  /** Test id for the dialog content. */
  testId?: string
  /** Extra classes for the dialog panel, e.g. a wider max-width. */
  className?: string
}

export function StudioModal({ onClose, title, description, hideHeaderText = false, size = "md", children, testId, className }: StudioModalProps) {
  useStudioEscape(onClose)
  useFocusRestore()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid={testId}
        className={cn(
          "flex min-w-0 max-h-[calc(100dvh-1.5rem)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0",
          // Never taller than the viewport: `sm:` is a width breakpoint, so a
          // landscape phone would otherwise get an 85vh box on a 375px-tall screen.
          "sm:max-h-[min(85dvh,calc(100dvh-2rem))]",
          SIZE_CLASSES[size],
          className,
        )}
      >
        {/* pr-10 keeps long titles clear of the absolute close button. */}
        <DialogHeader className={cn("shrink-0 border-b p-4 pr-10", hideHeaderText && "sr-only")}>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto p-4", className)}>{children}</div>
}

export function ModalSection({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-2", className)}>
      {title ? <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3> : null}
      {children}
    </section>
  )
}

export function ModalFooterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DialogFooter className={cn("shrink-0 border-t p-3 sm:justify-end", className)}>
      {children}
    </DialogFooter>
  )
}

export function ReadOnlyBadge({ label = "read-only" }: { label?: string }) {
  return <Badge variant="secondary">{label}</Badge>
}

export type StudioCopyButtonProps = {
  getText: () => string
  label?: string
  copiedLabel?: string
  ariaLabel?: string
}

export function StudioCopyButton({ getText, label = "copy", copiedLabel = "copied!", ariaLabel }: StudioCopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={ariaLabel ?? label}
      aria-live="polite"
      onClick={() =>
        navigator.clipboard
          .writeText(getText())
          .then(() => {
            setCopied(true)
            if (timer.current) clearTimeout(timer.current)
            timer.current = setTimeout(() => setCopied(false), 2000)
          })
          .catch(() => {})
      }
    >
      {copied ? <Check /> : <Copy />} {copied ? copiedLabel : label}
    </Button>
  )
}

/**
 * Compact modal toolbar button.
 *
 * The Code & Schema toolbar carries up to four actions. At phone widths their
 * full labels overflowed the dialog, and because the dialog is `overflow-hidden`
 * the trailing buttons were clipped away and unreachable. Labels collapse to
 * icons below `sm`.
 *
 * `aria-label` pins the accessible name at every width. It has to be an
 * attribute rather than a visually-hidden span: jsdom does not apply Tailwind
 * classes, so `hidden sm:inline` spans would both render *and* be announced,
 * producing a doubled name like "ResetReset" in tests.
 */
export type StudioToolbarButtonProps = {
  label: string
  icon: LucideIcon
  onClick?: () => void
  variant?: "default" | "outline" | "secondary" | "ghost"
  disabled?: boolean
}

export function StudioToolbarButton({ label, icon: Icon, onClick, variant = "outline", disabled }: StudioToolbarButtonProps) {
  return (
    <Button variant={variant} size="sm" onClick={onClick} disabled={disabled} aria-label={label} title={label}>
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

/**
 * Tab trigger that stays legible on narrow viewports.
 *
 * `TabsList` is `inline-flex w-fit` with `whitespace-nowrap` triggers, so five
 * labelled tabs (~480px) overflowed a 343px-wide dialog. The icon is dropped
 * below `sm` and the label is shortened so all five fit; the full label stays
 * in the accessible name and the tooltip.
 */
export type StudioTabProps = {
  value: string
  label: string
  shortLabel?: string
  icon?: LucideIcon
}

export function StudioTab({ value, label, shortLabel, icon: Icon }: StudioTabProps) {
  return (
    <TabsTrigger value={value} aria-label={label} title={label} className="gap-1 px-2 sm:gap-1.5 sm:px-3">
      {Icon ? <Icon className="hidden size-3.5 sm:block" /> : null}
      <span className="sm:hidden">{shortLabel ?? label}</span>
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  )
}

export type CodeEditorProps = {
  value: string
  onChange?: (value: string) => void
  label: string
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
  testId?: string
}

/**
 * Viewport-relative editor sizing.
 *
 * A fixed `min-h-[240px]` overflowed short viewports (landscape phones) and a
 * bare `flex-1` collapsed inside the scrollable tab panes. Clamping to `dvh`
 * keeps the editor usable on a phone and bounded on a desktop modal, and the
 * surrounding pane scrolls so the hints below stay reachable.
 *
 * `grow` (not `flex-1`) is deliberate: `flex-1` sets `flex-basis: 0`, which
 * discards the `height` above and squashed the editor to ~65px. `grow` keeps
 * the clamped height as the basis, expands into spare space on tall windows,
 * and `min-h-[8rem]` stops it collapsing on short ones.
 */
const EDITOR_SIZE = "h-[clamp(11rem,38dvh,24rem)] max-h-[60dvh] min-h-[8rem] grow"

export function CodeEditor({ value, onChange, label, placeholder, readOnly = false, minHeight, testId }: CodeEditorProps) {
  const style = minHeight === undefined ? undefined : { minHeight }
  if (readOnly) {
    return (
      <pre
        aria-label={label}
        data-testid={testId}
        className={cn(
          "min-w-0 w-full max-w-full overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed",
          EDITOR_SIZE,
        )}
        style={style}
      >
        {value}
      </pre>
    )
  }
  return (
    <textarea
      aria-label={label}
      data-testid={testId}
      className={cn(
        "min-w-0 w-full max-w-full resize-none overflow-auto rounded-md border border-input bg-card p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus-visible:border-studio-accent focus-visible:ring-studio-accent/30 focus-visible:ring-[3px]",
        EDITOR_SIZE,
      )}
      spellCheck={false}
      wrap="off"
      placeholder={placeholder}
      value={value}
      style={style}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

export type ValidationIssue = { path?: string; message: string }

export function ValidationSummary({ error, issues }: { error?: string | null; issues?: ValidationIssue[] }) {
  if (issues && issues.length > 0) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        <ul className="list-disc space-y-1 pl-5">
          {issues.map((issue, i) => (
            <li key={`${issue.path ?? "issue"}-${i}`}>
              {issue.path ? <span className="font-mono">{issue.path}: </span> : null}
              {issue.message}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
        ✕ {error}
      </div>
    )
  }
  return null
}

export type ConfirmApplyDialogProps = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmApplyDialog({
  open,
  title = "Replace current form?",
  description = "This replaces the fields on the canvas. This cannot be undone except with Undo (Ctrl+Z) right after.",
  confirmLabel = "Replace",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmApplyDialogProps) {
  useStudioEscape(onCancel)
  if (!open) return null
  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
