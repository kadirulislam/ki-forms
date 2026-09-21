import { useMemo, useRef, useState } from "react"
import type { FormEvent, KeyboardEvent, ReactNode } from "react"
import { FieldRenderer } from "./FieldRenderer"
import type { FormApi, KiFormComponents, KiTheme } from "../types"
import { themeToCssVars } from "../theme"
import { shouldShow } from "../utils/conditions"

type Props = {
  form: FormApi
  components: KiFormComponents
  className?: string
  theme?: KiTheme
  stepLabels?: { next?: string; previous?: string; submit?: string }
  /** Prebuilt <button type=submit> injected by KiForm (busy/label aware). */
  submitButton?: ReactNode
  /** Built-in status line injected by KiForm (endpoint submissions only). */
  statusLine?: ReactNode
  /** Full submit handler from KiForm (validation + endpoint POST). */
  onSubmitEvent?: (e?: FormEvent) => void
}

/**
 * variant="conversational" — one visible field per step (the one Typeform-style
 * feature ki-forms adopts). Added in 2.1.0.
 */
export function ConversationalForm({
  form,
  components,
  className,
  theme,
  stepLabels,
  submitButton,
  statusLine,
  onSubmitEvent,
}: Props) {
  const visible = useMemo(
    () => form.fields.filter((f) => shouldShow(f, form.values)),
    [form.fields, form.values]
  )

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const inputRef = useRef<HTMLInputElement | HTMLElement | null>(null)

  const clamped = Math.min(step, Math.max(visible.length - 1, 0))
  const current = visible[clamped]
  const labels = {
    next: stepLabels?.next ?? "Next",
    previous: stepLabels?.previous ?? "Back",
    submit: stepLabels?.submit ?? "Submit",
  }
  const isLast = clamped === visible.length - 1

  function go(delta: 1 | -1) {
    const next = clamped + delta
    if (next < 0) return
    if (delta === 1 && !form.validateField(current.name)) {
      // stay on the failing step; focus the field so the error is actionable
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    setDirection(delta)
    setStep(next)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (onSubmitEvent) {
      onSubmitEvent()
      return
    }
    form.handleSubmit()
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return
    const tag = (e.target as HTMLElement).tagName
    if (tag === "TEXTAREA") return // newline belongs to the user
    e.preventDefault()
    if (isLast) handleSubmit(e)
    else go(1)
  }

  const progress = visible.length === 0 ? 100 : Math.round((clamped / visible.length) * 100)

  return (
    <form
      className={["ki-form ki-conversational", className].filter(Boolean).join(" ")}
      style={theme ? themeToCssVars(theme) : undefined}
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
    >
      {visible.length === 0 || !current ? (
        submitButton ?? <button type="submit" className="ki-step-btn primary">{labels.submit}</button>
      ) : (
        <>
          <div className="ki-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="ki-progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div key={current.name} className={`ki-step ${direction === 1 ? "ki-step-fwd" : "ki-step-back"}`}>
            <FieldRenderer field={current} form={form} components={components} />
          </div>

          <div className="ki-step-nav">
            {clamped > 0 && (
              <button type="button" className="ki-step-btn" onClick={() => go(-1)}>
                ← {labels.previous}
              </button>
            )}
            <span className="ki-step-count">
              {clamped + 1} / {visible.length}
            </span>
            {isLast ? (
              submitButton ?? (
                <button type="submit" className="ki-step-btn primary">{labels.submit}</button>
              )
            ) : (
              <button type="button" className="ki-step-btn primary" onClick={() => go(1)}>
                {labels.next} →
              </button>
            )}
          </div>
          {statusLine}
        </>
      )}
    </form>
  )
}
