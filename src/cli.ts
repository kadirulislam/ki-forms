#!/usr/bin/env node
import { createIo, runCli } from "./cli/run"

const io = createIo(process.cwd(), (line) => console.log(line), (line) => console.error(line))

try {
  process.exitCode = runCli(process.argv.slice(2), io)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
