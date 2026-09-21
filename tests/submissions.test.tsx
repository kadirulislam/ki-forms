import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { KiForm } from "../src/renderer/KiForm"
import { toReactSnippet } from "../studio/lib/export"
import { appsScript, diagnoseNoCors, isAppsScriptUrl, isHttpUrl } from "../studio/lib/sheets"

/**
 * 2.2.0 submission layer: `endpoint` POSTs { values, meta } while the frozen
 * 2.0.0 `onSubmit` path stays untouched (forms without endpoint behave exactly
 * as in 2.1.0).
 */

const FIELDS = [{ name: "email", type: "email" as const, required: true }]

describe("submissions (endpoint prop, 2.2.0)", () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    )
    ;(globalThis as any).fetch = fetchMock
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("onSubmit-only form: no fetch, no status line (2.0.0 behavior unchanged)", async () => {
    const onSubmit = vi.fn()
    render(<KiForm fields={FIELDS} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } })
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form")!)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.querySelector(".ki-status")).toBeNull()
  })

  it("posts { values, meta } JSON to endpoint after validation passes", async () => {
    const onSubmit = vi.fn()
    const onSubmitted = vi.fn()
    render(
      <KiForm fields={FIELDS} endpoint="https://api.example.test/collect" onSubmit={onSubmit} onSubmitted={onSubmitted} />,
    )
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } })
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form")!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe("https://api.example.test/collect")
    expect(init.method).toBe("POST")
    expect(init.headers["Content-Type"]).toBe("application/json")
    const body = JSON.parse(init.body)
    expect(body.values).toEqual({ email: "a@b.co" })
    expect(body.meta.submittedAt).toBeTruthy()
    expect(typeof body.meta.pageUrl === "string" || body.meta.pageUrl === undefined).toBe(true)
    // onSubmit still fires alongside the endpoint (both worlds)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ ok: true })))
    // success status line appears
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy())
  })

  it("invalid form: validation blocks the POST entirely", async () => {
    render(<KiForm fields={FIELDS} endpoint="https://api.example.test/collect" />)
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form")!)
    await new Promise((r) => setTimeout(r, 20))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.querySelector(".ki-status")).toBeNull()
  })

  it("failed request: error status line with Try again, retry works", async () => {
    fetchMock = vi.fn(() => Promise.resolve(new Response("nope", { status: 500 })))
    ;(globalThis as any).fetch = fetchMock
    render(<KiForm fields={FIELDS} endpoint="https://api.example.test/collect" />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } })
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form")!)
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Something went wrong."))
    // retry available and functional
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it("custom labels + hideSubmitStatus are honored", async () => {
    render(
      <KiForm
        fields={FIELDS}
        endpoint="https://api.example.test/collect"
        submitLabel="Send"
        submittingLabel="Sending…"
        successLabel="Got it!"
        hideSubmitStatus
      />,
    )
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } })
    const form = screen.getByRole("button", { name: "Send" }).closest("form")!
    fireEvent.submit(form)
    await waitFor(() => expect(screen.getByRole("button", { name: "Sending…" })).toBeTruthy())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    // hidden status: no status role anywhere
    expect(document.querySelector(".ki-status")).toBeNull()
  })

  it("Apps Script endpoints switch to text/plain (no CORS preflight)", async () => {
    render(<KiForm fields={FIELDS} endpoint="https://script.google.com/macros/s/AKfyc/exec" />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } })
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form")!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBe("text/plain;charset=utf-8")
  })

  it("conversational variant submits through the endpoint too", async () => {
    render(
      <KiForm
        fields={FIELDS}
        variant="conversational"
        endpoint="https://api.example.test/collect"
        onSubmit={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a@b.co" } })
    fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form")!)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  })

  it("submitLabel falls back to stepLabels.submit for compatibility", () => {
    render(
      <KiForm fields={FIELDS} variant="conversational" stepLabels={{ submit: "Send it" }} endpoint={undefined} />,
    )
    expect(screen.getByRole("button", { name: "Send it" })).toBeTruthy()
  })
})

describe("export: endpoint in React snippet", () => {
  it("bakes endpoint into the snippet and drops console.log onSubmit", () => {
    const snippet = toReactSnippet("MyForm", [{ name: "email", type: "email" }], {
      endpoint: "https://script.google.com/macros/s/X/exec",
    })
    expect(snippet).toContain('endpoint="https://script.google.com/macros/s/X/exec"')
    expect(snippet).not.toContain("console.log")
    expect(snippet).toContain("<KiForm")
  })

  it("without endpoint, snippet keeps the classic onSubmit", () => {
    const snippet = toReactSnippet("MyForm", [{ name: "email", type: "email" }])
    expect(snippet).toContain("console.log(values)")
    expect(snippet).not.toContain("endpoint=")
  })

  it("onSubmitBody overrides the default handler", () => {
    const snippet = toReactSnippet("MyForm", [{ name: "email" }], {
      endpoint: "https://x.test",
      onSubmitBody: "await saveToCrm(values)",
    })
    expect(snippet).toContain("await saveToCrm(values)")
  })
})

describe("sheets lib", () => {
  it("detects Apps Script /exec URLs", () => {
    expect(isAppsScriptUrl("https://script.google.com/macros/s/AKfycb123/exec")).toBe(true)
    expect(isAppsScriptUrl("https://script.google.com/macros/s/AKfycb123/dev")).toBe(true)
    expect(isAppsScriptUrl("https://script.google.com/macros/s/AKfycb123/exec?x=1")).toBe(true)
    expect(isAppsScriptUrl("https://api.example.test/collect")).toBe(false)
    expect(isAppsScriptUrl("not a url")).toBe(false)
  })

  it("isHttpUrl accepts http(s) only", () => {
    expect(isHttpUrl("https://x.test")).toBe(true)
    expect(isHttpUrl("http://x.test")).toBe(true)
    expect(isHttpUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpUrl("")).toBe(false)
  })

  it("Apps Script payload is doPost-based and preflight-safe", () => {
    const s = appsScript()
    expect(s).toContain("function doPost(e)")
    expect(s).toContain("JSON.parse(e.postData.contents)")
    expect(s).toContain("LockService")
    expect(s).toContain("appendRow")
  })

  it("diagnoseNoCors flags the classic silent-failure traps for Apps Script URLs", () => {
    const tips = diagnoseNoCors("https://script.google.com/macros/s/X/exec")
    expect(tips.join(" ")).toContain("Anyone")
    expect(diagnoseNoCors("https://api.example.test").length).toBe(1)
  })
})
