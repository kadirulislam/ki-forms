import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import {
  AI_KEY_SESSION_KEY,
  buildSystemPrompt,
  buildUserPrompt,
  completionsUrl,
  extractJson,
  generateSchema,
  saveAiKey,
} from "../studio/lib/ai"
import { AiPanel } from "../studio/components/AiPanel"

function chatCompletion(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response
}

describe("AI schema authoring (2.5.0)", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("system prompt states the schema contract", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain("ONLY JSON")
    expect(prompt).toContain("showIf")
    expect(prompt).toContain("minLength")
    expect(prompt).toContain("accentColor")
    expect(prompt).toContain("Never emit onChange")
  })

  it("user prompt carries the request and canvas context", () => {
    expect(buildUserPrompt("A signup form", [])).toContain("empty")
    const withContext = buildUserPrompt("Extend it", [{ name: "email" }])
    expect(withContext).toContain("Extend it")
    expect(withContext).toContain("email")
  })

  it("extracts JSON from fenced and prose-wrapped output", () => {
    expect(extractJson(`[{"name":"email"}]`)).toEqual([{ name: "email" }])
    expect(extractJson("```json\n{\"version\":1}\n```")).toEqual({ version: 1 })
    expect(extractJson('Here you go: [{"name":"a"}] hope it helps')).toEqual([{ name: "a" }])
    expect(() => extractJson("no json here")).toThrow()
  })

  it("posts to the chat-completions URL with the session key only in the header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatCompletion(`[{"name":"email","type":"email"}]`))
    const result = await generateSchema({
      endpoint: "https://api.openai.com/v1/",
      apiKey: "sk-test",
      model: "gpt-4o-mini",
      systemPrompt: "sys",
      userPrompt: "user",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.openai.com/v1/chat/completions")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test")
    expect(JSON.stringify(init.body)).not.toContain("sk-test")
  })

  it("reports provider and network failures without applying anything", async () => {
    const httpFail = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "bad key" } }),
    })
    const denied = await generateSchema({
      endpoint: "https://x",
      apiKey: "k",
      model: "m",
      systemPrompt: "s",
      userPrompt: "u",
      fetchImpl: httpFail as unknown as typeof fetch,
    })
    expect(denied.ok).toBe(false)
    if (!denied.ok) expect(denied.error).toContain("401")

    const down = vi.fn().mockRejectedValue(new Error("offline"))
    const offline = await generateSchema({
      endpoint: "https://x",
      apiKey: "k",
      model: "m",
      systemPrompt: "s",
      userPrompt: "u",
      fetchImpl: down as unknown as typeof fetch,
    })
    expect(offline.ok).toBe(false)

    const garbage = vi.fn().mockResolvedValue(chatCompletion("not json"))
    const unparsable = await generateSchema({
      endpoint: "https://x",
      apiKey: "k",
      model: "m",
      systemPrompt: "s",
      userPrompt: "u",
      fetchImpl: garbage as unknown as typeof fetch,
    })
    expect(unparsable.ok).toBe(false)

    const missing = await generateSchema({ endpoint: "https://x", apiKey: "", model: "m", systemPrompt: "s", userPrompt: "u" })
    expect(missing.ok).toBe(false)
  })

  it("keeps the API key in sessionStorage, never localStorage", () => {
    saveAiKey("sk-abc")
    expect(sessionStorage.getItem(AI_KEY_SESSION_KEY)).toBe("sk-abc")
    expect(localStorage.getItem(AI_KEY_SESSION_KEY)).toBeNull()
    saveAiKey("")
    expect(sessionStorage.getItem(AI_KEY_SESSION_KEY)).toBeNull()
  })

  it("panel generates, previews, and applies a proposal", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(chatCompletion(JSON.stringify([{ name: "email", type: "email", required: true }])))
    vi.stubGlobal("fetch", fetchMock)
    const onApply = vi.fn()
    render(<AiPanel fields={[]} onApplyDocument={onApply} />)

    // Key gate: empty key disables generation.
    expect((screen.getByRole("button", { name: "Generate schema" }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText("API key (session only)"), { target: { value: "sk-test" } })
    fireEvent.change(screen.getByLabelText("Form description"), { target: { value: "A signup form" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate schema" }))

    await waitFor(() => expect(screen.getByText(/Proposed schema/)).toBeTruthy())
    const preview = screen.getByText(/Proposed schema/).closest("section")!
    expect(preview.textContent).toContain("1 fields")
    expect(preview.textContent).toContain("email")
    fireEvent.click(screen.getByRole("button", { name: "Apply to canvas" }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0].fields).toEqual([{ name: "email", type: "email", required: true }])
  })

  it("panel surfaces invalid model output as path-specific issues", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatCompletion(JSON.stringify([{ name: "", type: "nope" }])))
    vi.stubGlobal("fetch", fetchMock)
    render(<AiPanel fields={[]} onApplyDocument={vi.fn()} />)
    fireEvent.change(screen.getByLabelText("API key (session only)"), { target: { value: "sk-test" } })
    fireEvent.change(screen.getByLabelText("Form description"), { target: { value: "Broken" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate schema" }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy())
    expect(screen.queryByText(/Proposed schema/)).toBeNull()
  })

  it("normalizes the completions URL", () => {
    expect(completionsUrl("https://api.openai.com/v1")).toBe("https://api.openai.com/v1/chat/completions")
    expect(completionsUrl("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1/chat/completions")
    expect(completionsUrl("  https://x.example/api  ")).toBe("https://x.example/api/chat/completions")
    expect(completionsUrl("https://x.example/api/chat/completions")).toBe("https://x.example/api/chat/completions")
  })

  it("rejects non-http endpoints before fetching", async () => {
    const fetchMock = vi.fn()
    const result = await generateSchema({
      endpoint: "ftp://x.example",
      apiKey: "k",
      model: "m",
      systemPrompt: "s",
      userPrompt: "u",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    expect(result.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("explains 404s with the called URL and path hints", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const result = await generateSchema({
      endpoint: "https://api.openai.com",
      apiKey: "k",
      model: "m",
      systemPrompt: "s",
      userPrompt: "u",
      fetchImpl: fetchMock as unknown as typeof fetch,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("404")
      expect(result.error).toContain("https://api.openai.com/chat/completions")
    }
  })
})
