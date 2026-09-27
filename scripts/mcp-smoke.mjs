// Stdio smoke test for the built MCP server.
//
// In-process tests cover the protocol logic, but they cannot prove the thing
// that actually breaks: the shebang, the line framing, and stdout discipline.
// This spawns the real binary and drives an actual handshake.
//
//   node scripts/mcp-smoke.mjs [path/to/mcp.js]

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(process.argv[2] ?? join(here, "..", "dist", "mcp.js"))

if (!existsSync(target)) {
  console.error(`MCP bundle not found: ${target}\nRun \`npm run build\` first.`)
  process.exit(1)
}

const child = spawn(process.execPath, [target], { stdio: ["pipe", "pipe", "pipe"] })

let buffer = ""
const responses = []
let stderr = ""

child.stderr.setEncoding("utf8")
child.stderr.on("data", (chunk) => {
  stderr += chunk
})
child.stdout.setEncoding("utf8")
child.stdout.on("data", (chunk) => {
  buffer += chunk
  for (;;) {
    const index = buffer.indexOf("\n")
    if (index === -1) break
    const line = buffer.slice(0, index).trim()
    buffer = buffer.slice(index + 1)
    if (line) responses.push(JSON.parse(line))
  }
})

const send = (payload) => child.stdin.write(`${JSON.stringify(payload)}\n`)
const waitFor = (count) =>
  new Promise((resolveWait, rejectWait) => {
    let tries = 0
    const timer = setInterval(() => {
      if (responses.length >= count) {
        clearInterval(timer)
        resolveWait()
      } else if (++tries > 120) {
        clearInterval(timer)
        rejectWait(new Error(`timed out waiting for ${count} responses (got ${responses.length})`))
      }
    }, 50)
  })

const EXPECTED_TOOLS = ["validate_schema", "list_templates", "scaffold_form", "export_component"]
const check = (condition, message) => {
  if (!condition) throw new Error(message)
}

try {
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {} } })
  await waitFor(1)
  const info = responses[0].result
  check(info?.serverInfo?.name === "ki-forms", "initialize did not identify as ki-forms")
  check(Boolean(info?.protocolVersion), "initialize returned no protocolVersion")

  // A notification must never be answered, or the client stream desyncs.
  const before = responses.length
  send({ jsonrpc: "2.0", method: "notifications/initialized" })
  await new Promise((r) => setTimeout(r, 250))
  check(responses.length === before, "a notification produced a response")

  send({ jsonrpc: "2.0", id: 2, method: "tools/list" })
  await waitFor(2)
  const names = responses[1].result.tools.map((t) => t.name)
  for (const name of EXPECTED_TOOLS) check(names.includes(name), `missing tool "${name}"`)

  send({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "validate_schema", arguments: { schema: [{ name: "a", type: "email" }] } } })
  send({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "validate_schema", arguments: { schema: [{ name: "a", type: "bogus" }] } } })
  send({ jsonrpc: "2.0", id: 5, method: "resources/read", params: { uri: "ki-forms://schema/ki-form.schema.json" } })
  // ids 1..5 => five responses so far.
  await waitFor(5)

  const byId = Object.fromEntries(responses.map((r) => [r.id, r]))
  check(JSON.parse(byId[3].result.content[0].text).valid === true, "validate_schema rejected a valid field")
  check(
    JSON.parse(byId[4].result.content[0].text).issues?.[0]?.path === "fields[0].type",
    "validate_schema did not report a path-specific issue",
  )
  // The resource must be the real, inlined JSON Schema an agent can rely on.
  const schema = JSON.parse(byId[5].result.contents[0].text)
  check(schema.$schema?.includes("draft-07"), "schema resource is not draft-07")
  check(Boolean(schema.definitions?.fieldObject?.properties?.name), "schema resource has no field definition")

  // An unknown method is a protocol error, not a fake success.
  send({ jsonrpc: "2.0", id: 6, method: "nope/nope" })
  await waitFor(6)
  check(responses.find((r) => r.id === 6)?.error?.code === -32601, "unknown method did not return -32601")

  check(stderr.trim() === "", `stderr was not clean: ${stderr.trim()}`)
  console.log(`MCP ok — ${names.join(", ")}`)
} catch (error) {
  console.error(`MCP smoke test failed: ${error.message}`)
  child.kill()
  process.exit(1)
} finally {
  child.stdin.end()
  child.kill()
}
