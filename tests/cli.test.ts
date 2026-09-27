// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createIo, runCli, EXIT_OK, EXIT_ERROR, EXIT_USAGE } from "../src/cli/run"
import { pascalCase, pickTemplate, slugify } from "../src/cli/scaffold"

/**
 * CLI tests drive the real filesystem in a throwaway directory and assert on
 * captured stdout/stderr plus exit codes, so they cover the paths a user
 * actually hits rather than a mocked IO layer.
 */

let cwd: string
let out: string[]
let err: string[]

function cli(...args: string[]): number {
  const io = createIo(cwd, (line) => out.push(line), (line) => err.push(line))
  return runCli(args, io)
}

const stdout = () => out.join("\n")
const stderr = () => err.join("\n")
const read = (rel: string) => readFileSync(join(cwd, rel), "utf8")

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), "ki-forms-cli-"))
  out = []
  err = []
})

afterEach(() => {
  rmSync(cwd, { recursive: true, force: true })
})

describe("ki-forms CLI: naming and template inference", () => {
  it("slugifies and pascal-cases a free-text name", () => {
    expect(slugify("waitlist form")).toBe("waitlist-form")
    expect(pascalCase("waitlist form")).toBe("WaitlistForm")
    expect(pascalCase("Job Application!")).toBe("JobApplication")
  })

  it("guarantees a component name that starts with a letter", () => {
    // "2fa setup" would otherwise produce "2FaSetup", an invalid identifier.
    expect(pascalCase(slugify("2fa setup"))).toBe("Form2faSetup")
  })

  it("infers a template from the phrase, falling back to blank", () => {
    expect(pickTemplate("waitlist form")).toBe("waitlist")
    expect(pickTemplate("job application")).toBe("job-app")
    expect(pickTemplate("contact us")).toBe("contact")
    expect(pickTemplate("customer feedback")).toBe("feedback")
    expect(pickTemplate("sign up")).toBe("signup")
    expect(pickTemplate("something unrelated")).toBe("blank")
  })
})

describe("ki-forms CLI: add", () => {
  it("scaffolds a component and a portable schema, inferring the template", () => {
    mkdirSync(join(cwd, "src"))
    expect(cli("add", "waitlist form")).toBe(EXIT_OK)
    expect(existsSync(join(cwd, "src/forms/WaitlistForm.tsx"))).toBe(true)
    expect(existsSync(join(cwd, "src/forms/waitlist-form.schema.json"))).toBe(true)
    expect(stdout()).toContain('from template "waitlist"')

    const component = read("src/forms/WaitlistForm.tsx")
    expect(component).toContain('import { KiForm } from "ki-forms"')
    expect(component).toContain('import "ki-forms/styles.css"')
    expect(component).toContain("export default function WaitlistForm()")

    const schema = JSON.parse(read("src/forms/waitlist-form.schema.json"))
    expect(schema.$schema).toBe("ki-forms/schema.json")
    expect(schema.version).toBe(1)
    expect(schema.fields).toHaveLength(2)
    expect(schema.variant).toBe("classic")
  })

  it("scaffolds into forms/ when the project has no src/", () => {
    expect(cli("add", "contact form")).toBe(EXIT_OK)
    expect(existsSync(join(cwd, "forms/ContactForm.tsx"))).toBe(true)
  })

  it("emits .jsx and a zod schema on request", () => {
    expect(cli("add", "job application", "--js", "--zod", "--dir", "gen")).toBe(EXIT_OK)
    const component = read("gen/JobApplication.jsx")
    expect(component).toContain("z.object({")
    // JSX must not carry TypeScript-only type annotations.
    expect(component).not.toContain("InferFormValues")
    expect(component).not.toContain(": FormValues")
  })

  it("bakes a validated endpoint into both artifacts", () => {
    expect(cli("add", "signup form", "--endpoint", "https://example.com/hook", "--dir", "f")).toBe(EXIT_OK)
    expect(read("f/SignupForm.tsx")).toContain('endpoint="https://example.com/hook"')
    expect(JSON.parse(read("f/signup-form.schema.json")).endpoint).toBe("https://example.com/hook")
  })

  it("rejects a non-http endpoint without writing anything", () => {
    expect(cli("add", "x form", "--endpoint", "ftp://bad", "--dir", "f")).toBe(EXIT_USAGE)
    expect(stderr()).toContain("--endpoint must be an http(s) URL")
    expect(existsSync(join(cwd, "f"))).toBe(false)
  })

  it("refuses to overwrite existing files unless forced", () => {
    expect(cli("add", "waitlist form")).toBe(EXIT_OK)
    expect(cli("add", "waitlist form")).toBe(EXIT_ERROR)
    expect(stderr()).toContain("Already exists")
    expect(cli("add", "waitlist form", "--force")).toBe(EXIT_OK)
  })

  it("writes nothing on --dry-run", () => {
    mkdirSync(join(cwd, "src"))
    expect(cli("add", "waitlist form", "--dry-run")).toBe(EXIT_OK)
    expect(stdout()).toContain("Would create")
    expect(existsSync(join(cwd, "src/forms"))).toBe(false)
  })

  it("emits machine-readable output with --json", () => {
    expect(cli("add", "survey", "--template", "feedback", "--dry-run", "--json")).toBe(EXIT_OK)
    const payload = JSON.parse(stdout())
    expect(payload).toMatchObject({ ok: true, dryRun: true, template: "feedback", component: "Survey" })
    expect(payload.files.map((f: { kind: string }) => f.kind)).toEqual(["component", "schema"])
  })

  it("rejects an unknown template", () => {
    expect(cli("add", "x form", "--template", "nope")).toBe(EXIT_USAGE)
    expect(stderr()).toContain("Unknown template")
  })
})

describe("ki-forms CLI: validate", () => {
  it("accepts a valid document and reports its shape", () => {
    writeFileSync(join(cwd, "ok.json"), JSON.stringify({ fields: [{ name: "email", type: "email" }], variant: "conversational" }))
    expect(cli("validate", "ok.json")).toBe(EXIT_OK)
    expect(stdout()).toContain("is valid")
    expect(stdout()).toContain("conversational")
  })

  it("accepts a bare field array", () => {
    writeFileSync(join(cwd, "arr.json"), JSON.stringify(["email", { name: "age", type: "number" }]))
    expect(cli("validate", "arr.json")).toBe(EXIT_OK)
    expect(stdout()).toContain("2 fields")
  })

  it("reports every issue with its path and exits non-zero", () => {
    writeFileSync(join(cwd, "bad.json"), JSON.stringify({ fields: [{ name: "a", type: "nope" }, { name: "a" }] }))
    expect(cli("validate", "bad.json")).toBe(EXIT_ERROR)
    expect(stderr()).toContain("fields[0].type: Unknown field type")
    expect(stderr()).toContain('fields[1].name: Duplicate field name "a"')
  })

  it("distinguishes malformed JSON from an invalid schema", () => {
    writeFileSync(join(cwd, "broken.json"), "nope")
    expect(cli("validate", "broken.json")).toBe(EXIT_ERROR)
    expect(stderr()).toContain("is not valid JSON")
  })

  it("reports a missing file", () => {
    expect(cli("validate", "absent.json")).toBe(EXIT_ERROR)
    expect(stderr()).toContain("File not found")
  })

  it("requires a file argument", () => {
    expect(cli("validate")).toBe(EXIT_USAGE)
  })
})

describe("ki-forms CLI: export", () => {
  it("round-trips a scaffolded schema back to the identical component", () => {
    // The strongest guarantee the CLI can offer: scaffolding then exporting the
    // schema it wrote reproduces byte-identical code, so the Studio, the CLI and
    // a hand-edited JSON file can never drift apart.
    mkdirSync(join(cwd, "src"), { recursive: true })
    expect(cli("add", "waitlist form")).toBe(EXIT_OK)
    expect(cli("export", "src/forms/waitlist-form.schema.json", "--component", "WaitlistForm", "--out", "again.tsx")).toBe(EXIT_OK)
    expect(read("again.tsx").trimEnd()).toBe(read("src/forms/WaitlistForm.tsx").trimEnd())
  })

  it("honours document settings and lets flags override them", () => {
    writeFileSync(
      join(cwd, "doc.json"),
      JSON.stringify({
        fields: ["email"],
        theme: { accentColor: "#ff0000" },
        variant: "conversational",
        endpoint: "https://example.com/hook",
      }),
    )
    expect(cli("export", "doc.json", "--out", "a.tsx")).toBe(EXIT_OK)
    const fromDoc = read("a.tsx")
    expect(fromDoc).toContain('variant="conversational"')
    expect(fromDoc).toContain('endpoint="https://example.com/hook"')
    expect(fromDoc).toContain("#ff0000")

    expect(cli("export", "doc.json", "--variant", "classic", "--endpoint", "https://other.dev/x", "--out", "b.tsx")).toBe(EXIT_OK)
    const overridden = read("b.tsx")
    expect(overridden).not.toContain("conversational")
    expect(overridden).toContain("https://other.dev/x")
  })

  it("writes to stdout by default", () => {
    writeFileSync(join(cwd, "f.json"), JSON.stringify([{ name: "email" }]))
    expect(cli("export", "f.json")).toBe(EXIT_OK)
    expect(stdout()).toContain("export default function MyForm()")
  })

  it("creates the output directory when nested", () => {
    writeFileSync(join(cwd, "f.json"), JSON.stringify(["email"]))
    expect(cli("export", "f.json", "--out", "deep/nested/Out.tsx")).toBe(EXIT_OK)
    expect(read("deep/nested/Out.tsx")).toContain("KiForm")
  })

  it("refuses to export an invalid schema", () => {
    writeFileSync(join(cwd, "bad.json"), JSON.stringify({ fields: [{ name: "a", type: "nope" }] }))
    expect(cli("export", "bad.json")).toBe(EXIT_ERROR)
    expect(stdout()).not.toContain("export default")
  })
})

describe("ki-forms CLI: top level", () => {
  it("lists templates", () => {
    expect(cli("list")).toBe(EXIT_OK)
    for (const id of ["blank", "waitlist", "contact", "signup", "job-app", "feedback"]) {
      expect(stdout()).toContain(id)
    }
  })

  it("prints help on request and usage errors when bare", () => {
    expect(cli("help")).toBe(EXIT_OK)
    expect(stdout()).toContain("ki-forms add")
    out = []
    expect(cli()).toBe(EXIT_USAGE)
    expect(stdout()).toContain("Usage")
  })

  it("reports a version", () => {
    expect(cli("--version")).toBe(EXIT_OK)
    expect(stdout()).toMatch(/^\d+\.\d+\.\d+$|dev$/)
  })

  it("rejects unknown commands and bad variants", () => {
    expect(cli("frobnicate")).toBe(EXIT_USAGE)
    expect(stderr()).toContain('Unknown command "frobnicate"')
    writeFileSync(join(cwd, "f.json"), JSON.stringify(["email"]))
    expect(cli("export", "f.json", "--variant", "sideways")).toBe(EXIT_USAGE)
  })
})
