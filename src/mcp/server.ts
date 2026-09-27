import { TOOLS, callTool, readSchemaResource, SCHEMA_RESOURCE_URI, type ToolResult } from "./tools"

/**
 * Minimal MCP stdio JSON-RPC server (2.5.0).
 *
 * Scope is deliberately narrow: the initialize handshake, `tools/list`,
 * `tools/call`, and `resources/*`. Chasing the full MCP surface would mean
 * chasing a spec that has changed more than once, and a focused server that
 * works in a real client today is worth more than a complete one that half-works.
 *
 * `handleRequest` is a pure function of (method, params) so the whole protocol
 * can be tested in-process; `src/mcp.ts` only adds stdio plumbing.
 */

/** MCP protocol revision this server speaks. */
export const PROTOCOL_VERSION = "2025-06-18"

export const SERVER_NAME = "ki-forms"

export type JsonRpcId = string | number | null

export type JsonRpcRequest = {
  jsonrpc?: string
  id?: JsonRpcId
  method?: string
  params?: Record<string, unknown>
}

export type JsonRpcResponse = {
  jsonrpc: "2.0"
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

// JSON-RPC error codes.
const PARSE_ERROR = -32700
const INVALID_REQUEST = -32600
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602

let serverVersion = "dev"

export function setServerVersion(version: string): void {
  serverVersion = version
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result }
}

function fail(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } }
}

function toToolResult(result: ToolResult): unknown {
  // MCP wraps tool output in `content`; a tool-level failure is signalled with
  // isError rather than a protocol error, so the model can read and react to it.
  return result
}

export function handleRequest(request: JsonRpcRequest): JsonRpcResponse | null {
  if (!request || typeof request !== "object") {
    return fail(null, INVALID_REQUEST, "Request must be a JSON-RPC object.")
  }
  if (request.jsonrpc !== "2.0") {
    return fail(request.id ?? null, INVALID_REQUEST, 'Missing or invalid "jsonrpc": expected "2.0".')
  }

  const { method, id, params } = request
  if (typeof method !== "string") {
    return fail(id ?? null, INVALID_REQUEST, 'Missing "method".')
  }

  // A notification has no id and must never receive a response — replying to
  // one desynchronises the client's stream.
  const isNotification = id === undefined
  const respond = (response: JsonRpcResponse) => (isNotification ? null : response)

  switch (method) {
    case "initialize":
      return respond(
        ok(id ?? null, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } },
          serverInfo: { name: SERVER_NAME, version: serverVersion },
        }),
      )

    case "notifications/initialized":
    case "notifications/cancelled":
      return null

    case "ping":
      return respond(ok(id ?? null, {}))

    case "tools/list":
      return respond(ok(id ?? null, { tools: TOOLS }))

    case "tools/call": {
      const name = params?.name
      if (typeof name !== "string") {
        return respond(fail(id ?? null, INVALID_PARAMS, 'params.name must be a string.'))
      }
      const args = (params?.arguments ?? {}) as Record<string, unknown>
      if (typeof args !== "object" || args === null || Array.isArray(args)) {
        return respond(fail(id ?? null, INVALID_PARAMS, "params.arguments must be an object."))
      }
      return respond(ok(id ?? null, toToolResult(callTool(name, args))))
    }

    case "resources/list": {
      const resource = readSchemaResource()
      return respond(
        ok(id ?? null, {
          resources: resource
            ? [
                {
                  uri: resource.uri,
                  name: "ki-forms JSON Schema",
                  description:
                    "The formal draft-07 schema for ki-forms documents. Read it before authoring fields so property names are exact.",
                  mimeType: resource.mimeType,
                },
              ]
            : [],
        }),
      )
    }

    case "resources/read": {
      const uri = params?.uri
      if (uri !== SCHEMA_RESOURCE_URI) {
        return respond(fail(id ?? null, INVALID_PARAMS, `Unknown resource "${String(uri)}".`))
      }
      const resource = readSchemaResource()
      if (!resource) {
        return respond(fail(id ?? null, METHOD_NOT_FOUND, "The JSON Schema resource is unavailable in this build."))
      }
      return respond(ok(id ?? null, { contents: [resource] }))
    }

    default:
      return respond(fail(id ?? null, METHOD_NOT_FOUND, `Unknown method "${method}".`))
  }
}

/**
 * Parse one line of input.
 *
 * Returns the response to write, an array for a JSON-RPC batch, or null when
 * there is nothing to say (blank line, or a batch of only notifications).
 */
export function handleLine(line: string): JsonRpcResponse | JsonRpcResponse[] | null {
  const trimmed = line.trim()
  if (trimmed === "") return null
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (error) {
    return fail(null, PARSE_ERROR, `Could not parse JSON: ${(error as Error).message}`)
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return fail(null, INVALID_REQUEST, "A JSON-RPC batch must not be empty.")
    }
    const responses = parsed
      .map((entry) => handleRequest(entry as JsonRpcRequest))
      .filter((r): r is JsonRpcResponse => r !== null)
    return responses.length > 0 ? responses : null
  }
  return handleRequest(parsed as JsonRpcRequest)
}
