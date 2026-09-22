/**
 * AI schema authoring (2.5.0): bring-your-own-key generation against any
 * OpenAI-compatible `/chat/completions` endpoint.
 *
 * Privacy contract (surfaced in the UI, asserted in tests):
 * - The API key lives in `sessionStorage` only — never localStorage, never the
 *   document, never a share link.
 * - Requests go straight from the browser to the configured endpoint.
 * - Model output is validated with the canonical Studio importer before
 *   anything touches the canvas; failures show path-specific errors.
 */

export const AI_KEY_SESSION_KEY = "ki-studio-ai-key"
export const AI_ENDPOINT_STORAGE_KEY = "ki-studio-ai-endpoint"
export const AI_MODEL_STORAGE_KEY = "ki-studio-ai-model"

export const DEFAULT_AI_ENDPOINT = "https://api.openai.com/v1"
export const DEFAULT_AI_MODEL = "gpt-4o-mini"

export type AiGenerateOptions = {
  endpoint: string
  apiKey: string
  model: string
  systemPrompt: string
  userPrompt: string
  fetchImpl?: typeof fetch
}

export type AiGenerateResult = { ok: true; raw: unknown } | { ok: false; error: string }

/** Compact schema contract for the model — mirrors schema/ki-form.schema.json. */
export function buildSystemPrompt(): string {
  return [
    "You generate ki-forms schemas as JSON. Output ONLY JSON, no prose, no code fences.",
    "",
    "Output is either a bare fields array or a full document:",
    '{"version":1,"fields":[...],"theme":{},"variant":"classic"}',
    "",
    "Field shape:",
    '{"name":"email","type":"email|text|password|number|tel|url|date|textarea|select|checkbox","label":"Email","placeholder":"you@x.com","required":true,"options":["A","B"],"defaultValue":"A","helperText":"...","className":"...","minLength":5,"maxLength":100,"pattern":"^[a-z]+$","min":0,"max":120,"showIf":{"field":"role","equals":"Admin"}}',
    "",
    "Rules:",
    "- Every field needs a unique non-empty name. String shorthand (\"email\") is allowed.",
    "- showIf is the ONLY conditional mechanism: {field, equals} or {field, notEquals}, plus optional all[] (AND) / any[] (OR) groups of the same shape. required:true means required exactly when visible.",
    "- select needs a non-empty options array. defaultValue must be a string, number, or boolean.",
    "- minLength/maxLength/pattern apply to text-like fields; min/max to number fields.",
    "- theme tokens (all optional strings): accentColor, borderColor, errorColor, helperColor, radius, surfaceColor, textColor, fontFamily. variant is classic or conversational.",
    "- Never emit onChange, functions, comments, or markdown. Keep labels human and placeholders concrete.",
  ].join("\n")
}

export function buildUserPrompt(description: string, currentFields: unknown): string {
  const context =
    Array.isArray(currentFields) && currentFields.length > 0
      ? `Current canvas (extend or replace thoughtfully): ${JSON.stringify(currentFields)}`
      : "Current canvas is empty."
  return `Describe the form, then output its schema.\n\nRequest: ${description.trim()}\n\n${context}`
}

/** Extract the first JSON value from model output (tolerates fences/prose). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const attempts: string[] = [trimmed]
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) attempts.push(fenced[1].trim())
  const start = trimmed.search(/[[{]/)
  const ends: number[] = []
  for (const closer of ["}", "]"]) {
    const idx = trimmed.lastIndexOf(closer)
    if (idx > start) ends.push(idx)
  }
  if (start !== -1 && ends.length > 0) attempts.push(trimmed.slice(start, Math.max(...ends) + 1))
  let lastError: unknown = null
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt)
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No JSON found in model output")
}

export function loadAiSettings(): { endpoint: string; model: string; hasKey: boolean } {
  let endpoint = DEFAULT_AI_ENDPOINT
  let model = DEFAULT_AI_MODEL
  try {
    endpoint = sessionStorage.getItem(AI_ENDPOINT_STORAGE_KEY) || localStorage.getItem(AI_ENDPOINT_STORAGE_KEY) || DEFAULT_AI_ENDPOINT
    model = sessionStorage.getItem(AI_MODEL_STORAGE_KEY) || localStorage.getItem(AI_MODEL_STORAGE_KEY) || DEFAULT_AI_MODEL
  } catch {
    // storage unavailable — defaults stand
  }
  let hasKey = false
  try {
    hasKey = (sessionStorage.getItem(AI_KEY_SESSION_KEY) ?? "") !== ""
  } catch {
    // non-fatal
  }
  return { endpoint, model, hasKey }
}

export function saveAiKey(apiKey: string): void {
  try {
    if (apiKey) sessionStorage.setItem(AI_KEY_SESSION_KEY, apiKey)
    else sessionStorage.removeItem(AI_KEY_SESSION_KEY)
  } catch {
    // non-fatal
  }
}

export function saveAiEndpoint(endpoint: string, model: string): void {
  try {
    localStorage.setItem(AI_ENDPOINT_STORAGE_KEY, endpoint)
    localStorage.setItem(AI_MODEL_STORAGE_KEY, model)
  } catch {
    // non-fatal
  }
}

export function completionsUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/+$/, "")
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`
}

export async function generateSchema(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const { apiKey } = options
  const endpoint = options.endpoint.trim()
  const model = options.model.trim()
  const { systemPrompt, userPrompt } = options
  const fetchImpl = options.fetchImpl ?? fetch
  if (!/^https?:\/\//i.test(endpoint)) {
    return { ok: false, error: "Endpoint must start with http:// or https:// — e.g. https://api.openai.com/v1." }
  }
  if (!apiKey) return { ok: false, error: "Missing API key — paste a session-only key first." }
  if (!model) return { ok: false, error: "Missing model name." }
  const url = completionsUrl(endpoint)
  let response: Response
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })
  } catch (err) {
    return { ok: false, error: `Request failed — ${(err as Error).message}. Check the endpoint URL, your network connection, and any adblocker, VPN, or CORS restrictions.` }
  }
  if (!response.ok) {
    let detail = ""
    try {
      const body: unknown = await response.json()
      const msg = (body as { error?: { message?: unknown } })?.error?.message
      if (typeof msg === "string" && msg) detail = `: ${msg.slice(0, 200)}`
    } catch {
      // fall through to status-only error
    }
    if (response.status === 404) {
      return { ok: false, error: `Provider returned 404 for ${url} — the path looks wrong. OpenAI needs https://api.openai.com/v1, OpenRouter needs https://openrouter.ai/api/v1.${detail}` }
    }
    return { ok: false, error: `Provider returned ${response.status}${detail}` }
  }
  let text = ""
  try {
    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[]
    }
    const content = body.choices?.[0]?.message?.content
    text = typeof content === "string" ? content : Array.isArray(content) ? content.join("") : ""
    if (!text) return { ok: false, error: "Provider returned an empty completion." }
    return { ok: true, raw: extractJson(text) }
  } catch (err) {
    return { ok: false, error: `Could not parse model output as JSON — ${(err as Error).message}` }
  }
}

export const AI_PROMPT_EXAMPLES = [
  {
    id: "waitlist",
    label: "Waitlist",
    prompt: "A waitlist form: work email (required), company, team size select (1-10, 11-50, 51+), and a referral source textarea. Only ask company when team size is 11+.",
  },
  {
    id: "booking",
    label: "Booking",
    prompt: "A booking form: name and email (required), date, party size number between 1 and 12, seating preference select (Indoor, Outdoor, No preference), and special requests textarea.",
  },
  {
    id: "feedback",
    label: "Feedback",
    prompt: "A feedback form: email, satisfaction select (1-5), a follow-up textarea shown unless satisfaction is 5, and a contact-ok checkbox shown only when satisfaction is 5.",
  },
] as const
