import { useCallback, useState } from "react"
import type {
  FormValues,
  KiFormProps,
  SubmissionMeta,
  SubmissionState,
  SubmitEndpointResult,
} from "../types"

type UseSubmitEndpointOptions = Pick<
  KiFormProps,
  "endpoint" | "method" | "headers" | "onSubmitted"
>

export type UseSubmitEndpointReturn = {
  /** "idle" | "submitting" | "success" | "error" — stays "idle" forever when no `endpoint`. */
  state: SubmissionState
  /** Human-readable error when state === "error". */
  error?: string
  /** Fire the POST. KiForm calls this only after validation succeeded. */
  send: (values: FormValues) => void
  /** Return to "idle" (e.g. when schema/fields change or on retry). */
  reset: () => void
}

function collectMeta(): SubmissionMeta {
  let pageUrl: string | undefined
  let referrer: string | undefined
  let userAgent: string | undefined
  try {
    pageUrl = typeof location !== "undefined" ? location.href : undefined
    referrer = typeof document !== "undefined" ? document.referrer : undefined
    userAgent = typeof navigator !== "undefined" ? navigator.userAgent : undefined
  } catch {
    // Non-browser env — meta stays minimal, submission still works.
  }
  return {
    submittedAt: new Date().toISOString(),
    pageUrl,
    referrer,
    userAgent,
  }
}

/**
 * Endpoint submission for KiForm (2.2.0, additive). Without `endpoint` this
 * hook is inert — the frozen 2.0.0 `onSubmit` contract is untouched.
 *
 * Payload: `{ values, meta }` as JSON. Works with Formspree, Web3Forms, Basin,
 * Discord/automation webhooks, and Google Apps Script Web Apps.
 */
export function useSubmitEndpoint(options: UseSubmitEndpointOptions): UseSubmitEndpointReturn {
  const { endpoint, method = "POST", headers, onSubmitted } = options
  const [state, setState] = useState<SubmissionState>("idle")
  const [error, setError] = useState<string | undefined>(undefined)

  const reset = useCallback(() => {
    setState("idle")
    setError(undefined)
  }, [])

  const send = useCallback(
    (values: FormValues) => {
      if (!endpoint) return
      setState("submitting")
      setError(undefined)

      const payload = JSON.stringify({ values, meta: collectMeta() })
      // Apps Script Web Apps cannot answer CORS preflights, so a JSON content
      // type would kill the request. text/plain = simple request, no preflight;
      // doPost still receives the raw body. Overridable via `headers`.
      const isAppsScript = /script\.google\.com/.test(endpoint)
      const init: RequestInit = {
        method,
        headers: {
          "Content-Type": isAppsScript ? "text/plain;charset=utf-8" : "application/json",
          ...headers,
        },
        body: payload,
      }

      fetch(endpoint, init)
        .then(async (res) => {
          let response: unknown = undefined
          const text = await res.text().catch(() => "")
          if (text) {
            try {
              response = JSON.parse(text)
            } catch {
              response = text
            }
          }
          const result: SubmitEndpointResult = res.ok
            ? { ok: true, response }
            : {
                ok: false,
                response,
                error:
                  (response as any)?.error ||
                  (typeof response === "string" && response ? response : undefined) ||
                  `Request failed (${res.status})`,
              }
          setState(result.ok ? "success" : "error")
          if (!result.ok) setError(result.error)
          onSubmitted?.(result)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          setState("error")
          setError(message || "Network error")
          onSubmitted?.({ ok: false, error: message || "Network error" })
        })
    },
    [endpoint, method, headers, onSubmitted],
  )

  return { state, error, send, reset }
}
