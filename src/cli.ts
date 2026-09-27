#!/usr/bin/env node
import { createIo, runCli } from "./cli/run"

const io = createIo(process.cwd(), (line) => console.log(line), (line) => console.error(line))

try {
  // `share` is async; every other command resolves synchronously.
  Promise.resolve(runCli(process.argv.slice(2), io)).then(
    (code) => {
      process.exitCode = code
    },
    (error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exitCode = 1
    },
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
