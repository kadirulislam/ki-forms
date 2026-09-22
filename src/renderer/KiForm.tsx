import { useEffect, useRef } from "react"
import { useKiForm } from "../core/useKiForm"
import { useSubmitEndpoint } from "../core/useSubmitEndpoint"
import { ConversationalForm } from "./ConversationalForm"
import { FieldRenderer } from "./FieldRenderer"
import { InputField } from "../fields/Input"
import { SelectField } from "../fields/Select"
import { TextareaField } from "../fields/Textarea"
import { CheckboxField } from "../fields/Checkbox"
import { themeToCssVars } from "../theme"
import type { KiFormComponents, KiFormProps, SubmissionState } from "../types"

const defaultComponents: KiFormComponents = {
  text: InputField,
  email: InputField,
  password: InputField,
  select: SelectField,
  textarea: TextareaField,
  number: InputField,
  checkbox: CheckboxField,
  tel: InputField,
  url: InputField,
  date: InputField,
}

function StatusLine({
  state,
  error,
  labels,
  onRetry,
  onReset,
}: {
  state: SubmissionState
  error?: string
  labels: { submitting?: string; success?: string; error?: string }
  onRetry: () => void
  onReset: () => void
}) {
  if (state === "submitting") {
    return (
      <p role="status" className="ki-status ki-status-busy">
        {labels.submitting ?? "Submitting…"}
      </p>
    )
  }
  if (state === "success") {
    return (
      <p role="status" className="ki-status ki-status-success">
        {labels.success ?? "Thanks! Your response has been recorded."}{" "}
        <button type="button" className="ki-status-link" onClick={onReset}>
          Submit another
        </button>
      </p>
   
)
  }
  if (state === "error") {
    return (
      <p role="status" className="ki-status ki-status-error">
        {(labels.error ?? "Something went wrong.") + (error ? ` ${error}` : "")}{" "}
        <button type="button" className="ki-status-link" onClick={onRetry}>
          Try again
        </button>
      </p>
    )
  }
  return null
}

export function KiForm(props: KiFormProps) {
  if (props.form) return <ControlledKiForm {...props} form={props.form} />
  return <ManagedKiForm {...props} />
}

function ManagedKiForm(props: KiFormProps) {
  const form = useKiForm(props)
  return <KiFormView {...props} form={form} />
}

function ControlledKiForm(props: KiFormProps & { form: NonNullable<KiFormProps["form"]> }) {
  return <KiFormView {...props} form={props.form} />
}

function KiFormView(props: KiFormProps & { form: NonNullable<KiFormProps["form"]> }) {
  const form = props.form
  const endpointCtl = useSubmitEndpoint(props)
  const hasEndpoint = typeof props.endpoint === "string" && props.endpoint.length > 0
  const formEl = useRef<HTMLFormElement | null>(null)

  // Controlled-form safety: when the endpoint itself changes (dev previews,
  // schema-driven apps), never show status from the previous endpoint.
  const endpointRef = useRef(props.endpoint)
  useEffect(() => {
    if (endpointRef.current !== props.endpoint) {
      endpointRef.current = props.endpoint
      endpointCtl.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.endpoint])

  const components: KiFormComponents = {
    ...defaultComponents,
    ...props.components,
  }

  /** Validate + fire onSubmit + (when endpoint is set) POST {values, meta}. */
  const handleSubmit = (e?: React.FormEvent) => {
    const ok = form.handleSubmitChecked(e)
    if (!ok) {
      // Move keyboard + screen-reader focus to the first invalid field.
      requestAnimationFrame(() => {
        const el = formEl.current?.querySelector('[aria-invalid="true"]')
        if (el instanceof HTMLElement) el.focus()
      })
      return
    }
    if (!hasEndpoint) return
    endpointCtl.send(form.values)
  }

  const busy = endpointCtl.state === "submitting"

  const submitButton = (
    <button
      type="submit"
      disabled={busy}
      className="ki-submit"
      data-busy={busy || undefined}
    >
      {busy
        ? (props.submittingLabel ?? "Submitting…")
        : (props.submitLabel ?? props.stepLabels?.submit ?? "Submit")}
    </button>
  )

  const status =
    hasEndpoint && !props.hideSubmitStatus ? (
      <StatusLine
        state={endpointCtl.state}
        error={endpointCtl.error}
        labels={{
          submitting: props.submittingLabel,
          success: props.successLabel,
          error: props.errorLabel,
        }}
        onRetry={() => endpointCtl.send(form.values)}
        onReset={endpointCtl.reset}
      />
    ) : null

  if (props.variant === "conversational") {
    return (
      <ConversationalForm
        form={form}
        components={components}
        className={props.className}
        theme={props.theme}
        stepLabels={props.stepLabels}
        submitButton={submitButton}
        statusLine={status}
        onSubmitEvent={handleSubmit}
      />
    )
  }

  return (
    <form
      ref={formEl}
      onSubmit={handleSubmit}
      className={["ki-form", props.className].filter(Boolean).join(" ")}
      style={props.theme ? themeToCssVars(props.theme) : undefined}
    >
      {form.fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          form={form}
          components={components}
        />
      ))}

      <ErrorSummary form={form} />
      {submitButton}
      {status}
    </form>
  )
}

/** Linked multi-error summary for screen-reader + keyboard users (classic variant). */
function ErrorSummary({ form }: { form: NonNullable<KiFormProps["form"]> }) {
  const entries = Object.entries(form.errors)
  if (entries.length < 2) return null
  return (
    <div role="alert" className="ki-error-summary">
      <strong>{entries.length} fields need attention</strong>
      <ul>
        {entries.map(([name, message]) => {
          const field = form.fields.find((f) => f.name === name)
          const label = field && typeof field.label === "string" ? field.label : name
          return (
            <li key={name}>
              <a href={`#ki-${name}`}>{label}: {message}</a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
