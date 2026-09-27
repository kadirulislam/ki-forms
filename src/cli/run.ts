import { parseArgs } from "node:util"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import { TEMPLATES } from "../codegen/templates"
import { exportReact } from "../codegen/react"
import { validateDocument, validateFields } from "../schema/validate"
import type { Field, KiTheme } from "../types"
import { generateFiles, pascalCase, pickTemplate, resolveAdd, slugify, type AddOptions, type TemplateId } from "./scaffold"

/** Injected by the tsup CLI build; undefined when running from source. */
declare const __KI_FORMS_VERSION__: string | undefined

export const EXIT_OK = 0
export const EXIT_ERROR = 1
export const EXIT_USAGE = 2

export type CliIo = {
  cwd: string
  log: (line: string) => void
  error: (line: string) => void
  exists: (path: string) => boolean
  readTextFile: (path: string) => string
  writeTextFile: (path: string, contents: string) => void
  ensureDir: (path: string) => void
}

export function createIo(cwd: string, log: (s: string) => void, error: (s: string) => void): CliIo {
  const abs = (p: string) => (isAbsolute(p) ? p : join(cwd, p))
  return {
    cwd,
    log,
    error,
    exists: (p) => existsSync(abs(p)),
    readTextFile: (p) => readFileSync(abs(p), "utf8"),
    writeTextFile: (p, contents) => writeFileSync(abs(p), contents, "utf8"),
    ensureDir: (p) => mkdirSync(abs(p), { recursive: true }),
  }
}

const USAGE = `ki-forms — build React forms from JSON schemas

Usage
  ki-forms add [name]        Scaffold a form component + portable schema JSON
  ki-forms list              List the available templates
  ki-forms validate <file>   Validate a ki-forms schema or document JSON
  ki-forms export <file>     Print a ready-to-paste React component
  ki-forms help              Show this help

Add options
  --template <id>            blank | waitlist | contact | signup | job-app | feedback
                             (inferred from the name when omitted)
  --dir <path>               Output directory (default: src/forms, or forms/ if
                             the project has no src/)
  --component <Name>         Component name (default: PascalCase of the name)
  --js                       Emit .jsx instead of .tsx
  --zod                      Include a zod schema and z.infer type
  --variant <name>           classic | conversational
  --endpoint <url>           Collect responses to an http(s) endpoint
  --force                    Overwrite existing files
  --dry-run                  Print what would be written, write nothing
  --json                     Machine-readable output (for agents)

Export options
  --component <Name>         Component name (default: MyForm)
  --js                       Emit JSX instead of TSX
  --zod                      Include a zod schema and z.infer type
  --variant <name>           classic | conversational (overrides the file)
  --endpoint <url>           Endpoint to bake in (overrides the file)
  --out <file>               Write to a file instead of stdout

Examples
  npx ki-forms add "waitlist form"
  npx ki-forms add "job application" --zod --dir src/app/forms
  npx ki-forms validate form.schema.json
  npx ki-forms export form.schema.json --component Signup --zod`

/**
 * Run a parse/resolution step, reporting failures without exiting.
 *
 * This deliberately returns a result rather than calling `process.exit`, so the
 * command layer stays a pure function of its arguments and remains testable.
 * Only the `src/cli.ts` entry point touches the process.
 */
function attempt<T>(fn: () => T, io: CliIo): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: fn() }
  } catch (error) {
    io.error((error as Error).message)
    io.error("Run `ki-forms help` for usage.")
    return { ok: false }
  }
}

function requireValue(values: Record<string, unknown>, key: string): string | undefined {
  const v = values[key]
  return typeof v === "string" ? v : undefined
}

function defaultDir(io: CliIo): string {
  return io.exists("src") ? "src/forms" : "forms"
}

function commandList(io: CliIo): number {
  io.log("Available templates:")
  for (const t of TEMPLATES) {
    io.log(`  ${t.id.padEnd(10)} ${t.name}`)
    io.log(`  ${" ".repeat(10)} ${t.description} (${t.fields.length} field${t.fields.length === 1 ? "" : "s"})`)
  }
  io.log("")
  io.log(`Scaffold one with: ki-forms add "waitlist form"`)
  return EXIT_OK
}

function commandAdd(argv: string[], io: CliIo): number {
  const parsed = attempt(
    () =>
      parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
          template: { type: "string" },
          dir: { type: "string" },
          component: { type: "string" },
          variant: { type: "string" },
          endpoint: { type: "string" },
          js: { type: "boolean", default: false },
          zod: { type: "boolean", default: false },
          force: { type: "boolean", default: false },
          "dry-run": { type: "boolean", default: false },
          json: { type: "boolean", default: false },
        },
      }),
    io,
  )
  if (!parsed.ok) return EXIT_USAGE
  const { values, positionals } = parsed.value

  const name = positionals.join(" ").trim() || "Untitled form"
  const template = (requireValue(values, "template") ?? pickTemplate(name)) as TemplateId
  const variant = (requireValue(values, "variant") ?? "classic") as AddOptions["variant"]
  if (variant !== "classic" && variant !== "conversational") {
    io.error(`--variant must be "classic" or "conversational" (got "${variant}")`)
    return EXIT_USAGE
  }
  const endpoint = requireValue(values, "endpoint")
  if (endpoint && !/^https?:\/\//.test(endpoint)) {
    io.error(`--endpoint must be an http(s) URL (got "${endpoint}")`)
    return EXIT_USAGE
  }

  const dir = requireValue(values, "dir") ?? defaultDir(io)
  const language = values.js === true ? "jsx" : "tsx"

  const resolvedResult = attempt(
    () =>
      resolveAdd({
        name,
        template,
        component: requireValue(values, "component") ?? pascalCase(slugify(name)),
        dir,
        language,
        zod: values.zod === true,
        variant,
        endpoint,
      }),
    io,
  )
  if (!resolvedResult.ok) return EXIT_USAGE
  const resolved = resolvedResult.value

  const { files, warnings } = generateFiles(resolved, dir)
  const dryRun = values["dry-run"] === true
  const asJson = values.json === true

  // Refuse to clobber before writing anything, so a partial scaffold is impossible.
  const existing = files.filter((f) => io.exists(f.path)).map((f) => f.path)
  if (existing.length > 0 && values.force !== true) {
    io.error(`Already exists: ${existing.join(", ")}`)
    io.error("Pass --force to overwrite, or --dir/--component to write elsewhere.")
    return EXIT_ERROR
  }

  if (!dryRun) {
    io.ensureDir(dir)
    for (const file of files) io.writeTextFile(file.path, file.contents)
  }

  if (asJson) {
    io.log(
      JSON.stringify(
        {
          ok: true,
          dryRun,
          template: resolved.template.id,
          name: resolved.name,
          component: resolved.component,
          dir,
          files: files.map((f) => ({ path: f.path, kind: f.kind })),
          warnings,
        },
        null,
        2,
      ),
    )
    return EXIT_OK
  }

  const verb = dryRun ? "Would create" : "Created"
  io.log(`${verb} ${resolved.template.label} (${resolved.template.fields.length} fields) from template "${resolved.template.id}"`)
  for (const file of files) io.log(`  ${file.path}`)
  if (warnings.length > 0) {
    io.log("")
    io.log("Export notes:")
    for (const w of warnings) io.log(`  - ${w}`)
  }
  io.log("")
  io.log("Next:")
  io.log(`  1. npm install ki-forms`)
  io.log(`  2. Render <${resolved.component} /> in your app`)
  io.log(`  3. Edit ${files[1]?.path} then re-run: ki-forms export ${files[1]?.path} --component ${resolved.component}`)
  io.log("")
  io.log("Or open the schema in the Studio: https://kadirulislam.github.io/ki-forms/studio/")
  return EXIT_OK
}

type LoadedSchema = { fields: Field[]; theme?: KiTheme; variant?: "classic" | "conversational"; endpoint?: string; name?: string }

function loadSchema(path: string, io: CliIo): LoadedSchema | null {
  if (!io.exists(path)) {
    io.error(`File not found: ${path}`)
    return null
  }
  let raw: unknown
  try {
    raw = JSON.parse(io.readTextFile(path))
  } catch (error) {
    io.error(`${path} is not valid JSON: ${(error as Error).message}`)
    return null
  }
  if (Array.isArray(raw)) {
    const result = validateFields(raw)
    if (!result.success) {
      reportIssues(io, path, result.issues)
      return null
    }
    return { fields: normalizeFields(result.data) }
  }
  const result = validateDocument(raw)
  if (!result.success) {
    reportIssues(io, path, result.issues)
    return null
  }
  return { ...result.data, fields: normalizeFields(result.data.fields) }
}

/** Canonical form: the string shorthand is a field name with text semantics. */
function normalizeFields(fields: readonly (Field | string)[]): Field[] {
  return fields.map((f) => (typeof f === "string" ? { name: f } : f)) as Field[]
}

function reportIssues(io: CliIo, path: string, issues: { path: string; message: string }[]): void {
  io.error(`${path} has ${issues.length} issue${issues.length > 1 ? "s" : ""}:`)
  for (const issue of issues) io.error(`  ${issue.path || "(root)"}: ${issue.message}`)
}

function commandValidate(argv: string[], io: CliIo): number {
  const parsed = attempt(() => parseArgs({ args: argv, allowPositionals: true, options: {} }), io)
  if (!parsed.ok) return EXIT_USAGE
  const file = parsed.value.positionals[0]
  if (!file) {
    io.error("Usage: ki-forms validate <file>")
    return EXIT_USAGE
  }
  const schema = loadSchema(file, io)
  if (!schema) return EXIT_ERROR
  const details = [
    `${schema.fields.length} field${schema.fields.length === 1 ? "" : "s"}`,
    schema.variant ?? "classic",
    schema.theme && Object.keys(schema.theme).length > 0 ? `${Object.keys(schema.theme).length} theme tokens` : null,
    schema.endpoint ? "endpoint set" : null,
  ].filter(Boolean)
  io.log(`${file} is valid — ${details.join(" · ")}`)
  return EXIT_OK
}

function commandExport(argv: string[], io: CliIo): number {
  const parsed = attempt(
    () =>
      parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
          component: { type: "string" },
          variant: { type: "string" },
          endpoint: { type: "string" },
          out: { type: "string" },
          js: { type: "boolean", default: false },
          zod: { type: "boolean", default: false },
        },
      }),
    io,
  )
  if (!parsed.ok) return EXIT_USAGE
  const { values, positionals } = parsed.value
  const file = positionals[0]
  if (!file) {
    io.error("Usage: ki-forms export <file>")
    return EXIT_USAGE
  }
  const schema = loadSchema(file, io)
  if (!schema) return EXIT_ERROR

  const variantFlag = requireValue(values, "variant")
  if (variantFlag && variantFlag !== "classic" && variantFlag !== "conversational") {
    io.error(`--variant must be "classic" or "conversational" (got "${variantFlag}")`)
    return EXIT_USAGE
  }
  const component = requireValue(values, "component") ?? "MyForm"

  const result = exportReact(component, schema.fields, {
    language: values.js === true ? "jsx" : "tsx",
    validation: values.zod === true ? "zod" : "none",
    variant: (variantFlag as "classic" | "conversational" | undefined) ?? schema.variant ?? "classic",
    endpoint: requireValue(values, "endpoint") ?? schema.endpoint,
    theme: schema.theme ?? {},
  })

  const out = requireValue(values, "out")
  if (out) {
    io.ensureDir(out.includes("/") || out.includes("\\") ? out.replace(/[\\/][^\\/]*$/, "") : ".")
    io.writeTextFile(out, result.code)
    io.log(`Wrote ${out}`)
  } else {
    io.log(result.code.replace(/\n$/, ""))
  }
  for (const warning of result.warnings) io.error(`note: ${warning.field}: ${warning.message}`)
  return EXIT_OK
}

function version(): string {
  return typeof __KI_FORMS_VERSION__ === "string" ? __KI_FORMS_VERSION__ : "dev"
}

export function runCli(argv: string[], io: CliIo): number {
  const [command, ...rest] = argv

  if (!command || command === "help" || command === "--help" || command === "-h") {
    io.log(USAGE)
    return command ? EXIT_OK : EXIT_USAGE
  }
  if (command === "--version" || command === "-v" || command === "version") {
    io.log(version())
    return EXIT_OK
  }

  switch (command) {
    case "add":
      return commandAdd(rest, io)
    case "list":
      return commandList(io)
    case "validate":
      return commandValidate(rest, io)
    case "export":
      return commandExport(rest, io)
    default:
      io.error(`Unknown command "${command}"`)
      io.error("Run `ki-forms help` for usage.")
      return EXIT_USAGE
  }
}
