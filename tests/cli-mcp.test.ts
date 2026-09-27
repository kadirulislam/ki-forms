// @vitest-environment node
import { describe, it, expect } from "vitest"
import { handleRequest, handleLine, setServerVersion, PROTOCOL_VERSION, type JsonRpcResponse } from "../src/mcp/server"
import { TOOLS, callTool, SCHEMA_RESOURCE_URI } from "../src/mcp/tools"
import { validateDocument, validateFields } from "../src/schema/validate"
import { exportReact } from "../src/codegen/react"
import { resolveAdd, generateFiles, pickTemplate } from "../src/cli/scaffold"
import type { Field } from "../src/types"

/**
 * MCP surface.
 *
 * The central claim is that the server is a thin shim: every tool must return
 * exactly what the underlying library function returns. These tests assert that
 * identity directly, which is what stops the server drifting away from the
 * Studio and the CLI.
 */

const req = (method: string, params?: Record<string, unknown>, id: unknown = 1) =>
  handleRequest({ jsonrpc: "2.0", id: id as never, method, params }) as JsonRpcResponse

const payload = (response: JsonRpcResponse) => JSON.parse(response.result ? (response.result as { content: { text: string }[] }).content[0].text : "{}")

describe("protocol", () => {
  it("completes the initialize handshake", () => {
    setServerVersion("9.9.9")
    const response = req("initialize", { protocolVersion: PROTOCOL_VERSION, capabilities: {} })
    expect(response.result).toMatchObject({
      protocolVersion: PROTOCOL_VERSION,
      serverInfo: { name: "ki-forms", version: "9.9.9" },
    })
    expect((response.result as { capabilities: Record<string, unknown> }).capabilities).toHaveProperty("tools")
  })

  it("answers ping", () => {
    expect(req("ping").result).toEqual({})
  })

  it("never responds to a notification", () => {
    // Replying to a notification desynchronises the client stream.
    expect(handleRequest({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull()
    expect(handleRequest({ jsonrpc: "2.0", method: "notifications/cancelled", params: { requestId: 1 } })).toBeNull()
  })

  it("reports unknown methods rather than pretending to succeed", () => {
    const response = req("resources/subscribe", {})
    expect(response.error?.code).toBe(-32601)
  })

  it("rejects malformed requests with the right codes", () => {
    expect(req("tools/list").result).toBeDefined()
    const bad = handleRequest({ id: 1, method: "tools/list" } as never)
    expect(bad?.error?.code).toBe(-32600)
    const noMethod = handleRequest({ jsonrpc: "2.0", id: 1 } as never)
    expect(noMethod?.error?.code).toBe(-32600)
  })

  it("reports a parse error without throwing", () => {
    const response = handleLine("{not json") as JsonRpcResponse
    expect(response.error?.code).toBe(-32700)
  })

  it("ignores blank lines", () => {
    expect(handleLine("   ")).toBeNull()
  })

  it("handles a batch, and a batch of only notifications", () => {
    const batch = handleLine(JSON.stringify([
      { jsonrpc: "2.0", id: 1, method: "ping" },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
    ])) as JsonRpcResponse[]
    expect(batch).toHaveLength(2)
    expect(batch.map((b) => b.id)).toEqual([1, 2])
    expect(handleLine(JSON.stringify([{ jsonrpc: "2.0", method: "notifications/initialized" }]))).toBeNull()
  })

  it("validates tools/call params", () => {
    expect(req("tools/call", { arguments: {} }).error?.code).toBe(-32602)
    expect(req("tools/call", { name: 5 }).error?.code).toBe(-32602)
    expect(req("tools/call", { name: "list_templates", arguments: [] }).error?.code).toBe(-32602)
  })
})

describe("tool registry", () => {
  it("advertises four tools, each with an input schema", () => {
    const { tools } = req("tools/list").result as { tools: typeof TOOLS }
    expect(tools.map((t) => t.name)).toEqual(["validate_schema", "list_templates", "scaffold_form", "export_component"])
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.inputSchema.type).toBe("object")
    }
  })

  it("returns a tool-level error, not a protocol error, for an unknown tool", () => {
    const response = req("tools/call", { name: "nope", arguments: {} })
    expect(response.error).toBeUndefined()
    const result = response.result as { isError?: boolean; content: { text: string }[] }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("Unknown tool")
  })
})

describe("validate_schema is the canonical validator", () => {
  it("agrees with validateFields for a good field array", () => {
    const fields = [{ name: "email", type: "email", required: true }]
    const direct = validateFields(fields)
    const viaMcp = payload(req("tools/call", { name: "validate_schema", arguments: { schema: fields } }))
    expect(direct.success).toBe(true)
    expect(viaMcp.valid).toBe(true)
    if (direct.success) expect(viaMcp.fieldCount).toBe(direct.data.length)
  })

  it("agrees with validateDocument on every issue", () => {
    const bad = { fields: [{ name: "a", type: "nope" }, { name: "a" }] }
    const direct = validateDocument(bad)
    const viaMcp = payload(req("tools/call", { name: "validate_schema", arguments: { schema: bad } }))
    expect(direct.success).toBe(false)
    if (!direct.success) expect(viaMcp.issues).toEqual(direct.issues)
  })

  it("accepts a JSON string as well as an object", () => {
    const viaMcp = payload(
      req("tools/call", { name: "validate_schema", arguments: { schema: JSON.stringify([{ name: "a" }]) } }),
    )
    expect(viaMcp.valid).toBe(true)
  })

  it("explains bad input instead of failing opaquely", () => {
    const result = req("tools/call", { name: "validate_schema", arguments: { schema: "{oops" } }).result as {
      isError?: boolean
      content: { text: string }[]
    }
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain("not valid JSON")
  })
})

describe("export_component is the Studio generator", () => {
  it("produces byte-identical code to exportReact", () => {
    const fields: Field[] = [
      { name: "firstName", type: "text", width: "half", required: true },
      { name: "lastName", type: "text", width: "half", required: true },
    ]
    const direct = exportReact("MyForm", fields, { language: "tsx", validation: "zod" }).code
    const viaMcp = payload(
      req("tools/call", { name: "export_component", arguments: { schema: fields, zod: true } }),
    )
    expect(viaMcp.code).toBe(direct)
  })

  it("honours a document's own settings", () => {
    const doc = { version: 1, fields: [{ name: "a" }], variant: "conversational", endpoint: "https://x.dev/h" }
    const viaMcp = payload(req("tools/call", { name: "export_component", arguments: { schema: doc } }))
    expect(viaMcp.code).toContain('variant="conversational"')
    expect(viaMcp.code).toContain('endpoint="https://x.dev/h"')
  })

  it("returns issues rather than emitting broken code", () => {
    const viaMcp = payload(
      req("tools/call", { name: "export_component", arguments: { schema: { fields: [{ name: "a", type: "bogus" }] } } }),
    )
    expect(viaMcp.ok).toBe(false)
    expect(viaMcp.code).toBeUndefined()
    expect(viaMcp.issues.length).toBeGreaterThan(0)
  })
})

describe("scaffold_form is the CLI scaffolder", () => {
  it("returns the same files the CLI would write, without writing them", () => {
    const viaMcp = payload(req("tools/call", { name: "scaffold_form", arguments: { name: "waitlist form" } }))
    const resolved = resolveAdd({
      name: "waitlist form",
      template: pickTemplate("waitlist form"),
      component: "WaitlistForm",
      dir: ".",
      language: "tsx",
      zod: false,
      variant: "classic",
    })
    const expected = generateFiles(resolved, ".")
    expect(viaMcp.template).toBe("waitlist")
    expect(viaMcp.files.map((f: { path: string }) => f.path)).toEqual(expected.files.map((f) => f.path))
    expect(viaMcp.files[0].contents).toBe(expected.files[0].contents)
  })

  it("rejects a non-http endpoint and a bad variant", () => {
    const bad = req("tools/call", { name: "scaffold_form", arguments: { name: "x", endpoint: "ftp://a" } })
    expect((bad.result as { isError?: boolean }).isError).toBe(true)
    const badVariant = req("tools/call", { name: "scaffold_form", arguments: { name: "x", variant: "wild" } })
    expect((badVariant.result as { isError?: boolean }).isError).toBe(true)
  })

  it("requires a name", () => {
    const response = req("tools/call", { name: "scaffold_form", arguments: {} })
    expect((response.result as { isError?: boolean }).isError).toBe(true)
  })
})

describe("resources", () => {
  it("lists and reads the JSON Schema when inlined", () => {
    const list = req("resources/list").result as { resources: { uri: string }[] }
    // Absent when running from source (the build inlines it); either way the
    // pairing must be consistent.
    if (list.resources.length === 0) {
      expect(req("resources/read", { uri: SCHEMA_RESOURCE_URI }).error?.code).toBe(-32601)
      return
    }
    expect(list.resources[0].uri).toBe(SCHEMA_RESOURCE_URI)
    const read = req("resources/read", { uri: SCHEMA_RESOURCE_URI }).result as { contents: { text: string }[] }
    expect(JSON.parse(read.contents[0].text).title).toBeTruthy()
  })

  it("rejects an unknown resource uri", () => {
    expect(req("resources/read", { uri: "ki-forms://nope" }).error?.code).toBe(-32602)
  })
})

describe("callTool dispatch", () => {
  it("routes every advertised tool", () => {
    for (const tool of TOOLS) {
      const args = tool.name === "list_templates" ? {} : { name: "a form", schema: [{ name: "x" }] }
      expect(() => callTool(tool.name, args as Record<string, unknown>)).not.toThrow()
    }
  })
})
