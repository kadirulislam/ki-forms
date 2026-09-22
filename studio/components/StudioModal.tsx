import { useEffect, useRef, useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { cn } from "../lib/utils"
import { Check, Copy } from "lucide-react"

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
}

export function StudioModal({ onClose, title, description, hideHeaderText = false, size = "md", children, testId }: StudioModalProps) {
  useStudioEscape(onClose)
  useFocusRestore()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid={testId}
        className={cn(
          "flex min-w-0 max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-h-[85vh]",
          SIZE_CLASSES[size],
        )}
      >
        <DialogHeader className={cn("shrink-0 border-b p-4", hideHeaderText && "sr-only")}>
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

export type CodeEditorProps = {
  value: string
  onChange?: (value: string) => void
  label: string
  placeholder?: string
  readOnly?: boolean
  minHeight?: number
  testId?: string
}

export function CodeEditor({ value, onChange, label, placeholder, readOnly = false, minHeight = 240, testId }: CodeEditorProps) {
  if (readOnly) {
    return (
      <pre
        aria-label={label}
        data-testid={testId}
        className="min-h-0 min-w-0 max-w-full flex-1 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed"
        style={{ minHeight }}
      >
        {value}
      </pre>
    )
  }
  return (
    <textarea
      aria-label={label}
      data-testid={testId}
      className="min-h-[240px] min-w-0 w-full max-w-full flex-1 resize-none overflow-auto rounded-md border border-input bg-card p-3 font-mono text-xs leading-relaxed text-foreground outline-none focus-visible:border-studio-accent focus-visible:ring-studio-accent/30 focus-visible:ring-[3px]"
      spellCheck={false}
      wrap="off"
      placeholder={placeholder}
      value={value}
      style={{ minHeight }}
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
