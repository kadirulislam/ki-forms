#!/usr/bin/env node
import { handleLine, setServerVersion } from "./mcp/server"

/**
 * MCP stdio entry point (2.5.0).
 *
 * Newline-delimited JSON-RPC on stdin/stdout, per the MCP stdio transport.
 *
 * Nothing may be written to stdout except protocol messages — a stray
 * console.log corrupts the stream and the client disconnects. All diagnostics
 * therefore go to stderr.
 *
 * Lines are split by hand rather than with `readline`: this project's tsconfig
 * includes the DOM lib, so Node's ReadableStream and the DOM's collide, and
 * `readline` also has its own opinions about very long lines and a missing
 * trailing newline — both of which matter for a protocol buffer.
 */

declare const __KI_FORMS_VERSION__: string | undefined

setServerVersion(typeof __KI_FORMS_VERSION__ === "string" ? __KI_FORMS_VERSION__ : "dev")

const write = (payload: unknown) => {
  process.stdout.write(`${JSON.stringify(payload)}\n`)
}

const dispatch = (line: string) => {
  try {
    const response = handleLine(line)
    if (response === null) return
    if (Array.isArray(response)) {
      for (const entry of response) write(entry)
    } else {
      write(response)
    }
  } catch (error) {
    // A crash here would kill the server mid-conversation; report and continue.
    process.stderr.write(`ki-forms mcp: ${(error as Error).message}\n`)
    write({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal error" } })
  }
}

let buffer = ""

process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk: string) => {
  buffer += chunk
  // A payload can never contain a raw newline: JSON strings escape them, and the
  // value is base64url. So a newline is always a frame boundary.
  for (;;) {
    const index = buffer.indexOf("\n")
    if (index === -1) break
    const line = buffer.slice(0, index)
    buffer = buffer.slice(index + 1)
    dispatch(line)
  }
})

process.stdin.on("end", () => {
  // A final line without a trailing newline is still a complete request.
  if (buffer.trim() !== "") dispatch(buffer)
  buffer = ""
  process.exit(0)
})

process.on("uncaughtException", (error: Error) => {
  process.stderr.write(`ki-forms mcp: uncaught ${error.message}\n`)
})
