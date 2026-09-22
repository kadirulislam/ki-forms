import { describe, it, expect, beforeAll } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import Ajv, { type ValidateFunction } from "ajv"
import { validateFields, validateDocument } from "../src/schema/validate"
import { TEMPLATES } from "../studio/lib/templates"
import {
  EXAMPLE_BASIC,
  EXAMPLE_CONDITIONAL,
  EXAMPLE_GROUP,
  EXAMPLE_STYLED,
} from "../website/lib/docs-content"

/**
 * Formal JSON Schema spec parity (P2.4.0).
 * The TypeScript validator (src/schema/validate.ts) stays canonical; the JSON
 * Schema must agree on everything expressible in JSON Schema. Documented,
 * asserted divergences: duplicate field names (TS-only) — JSON Schema has no
 * cross-item uniqueness; everything else must match.
 */

const SCHEMA_PATH = join(process.cwd(), "schema", "ki-form.schema.json")
const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"))

let validate: ValidateFunction

beforeAll(() => {
  const ajv = new Ajv({ allErrors: true })
  validate = ajv.compile(schema)
})

function expectSchemaValid(value: unknown) {
  const ok = validate(value)
  expect(JSON.stringify(validate.errors ?? null), `schema errors for ${JSON.stringify(value)}`).toBe("null")
  expect(ok).toBe(true)
}

function expectSchemaInvalid(value: unknown) {
  expect(validate(value)).toBe(false)
  expect(validate.errors?.length ?? 0).toBeGreaterThan(0)
}

describe("ki-form.schema.json", () => {
  it("has the published $id and draft-07 marker", () => {
    expect(schema.$id).toBe("https://kadirulislam.github.io/ki-forms/schema/ki-form.schema.json")
    expect(schema.$schema).toContain("draft-07")
  })

  it("every Studio template validates in both validators", () => {
    for (const t of TEMPLATES) {
      expect(validateFields(t.fields).success, `TS validator: ${t.id}`).toBe(true)
      expectSchemaValid(t.fields)
    }
  })

  it("every docs example validates in both validators", () => {
    for (const [name, example] of Object.entries({
      EXAMPLE_BASIC,
      EXAMPLE_CONDITIONAL,
      EXAMPLE_GROUP,
      EXAMPLE_STYLED,
    })) {
      expect(validateFields(example).success, `TS validator: ${name}`).toBe(true)
      expectSchemaValid(example)
    }
    const doc = { version: 1, fields: EXAMPLE_CONDITIONAL, variant: "classic" }
    expect(validateDocument(doc).success).toBe(true)
    expectSchemaValid(doc)
  })

  it("tolerates a $schema key in documents (autocomplete without breaking imports)", () => {
    const doc = {
      $schema: "https://kadirulislam.github.io/ki-forms/schema/ki-form.schema.json",
      version: 1,
      fields: [{ name: "email", type: "email", required: true }],
    }
    expect(validateDocument(doc).success).toBe(true)
    expectSchemaValid(doc)
  })

  it("rejects the same invalid inputs in both validators", () => {
    const badFields: unknown[][] = [
      [{ name: "", type: "text" }],
      [{ name: "x", type: "mystery" }],
      [{ name: "x", showIf: { equals: "Admin" } }],
      [{ name: "x", showIf: {} }],
      [{ name: "x", showIf: { all: [] } }],
      [{ name: "x", showIf: { field: "role" } }],
      [{ name: "x", showIf: { field: "role", equals: "A", notEquals: "B" } }],
      [{ name: "x", options: [] }],
      [{ name: "x", defaultValue: { nested: true } }],
      [{ name: "x", onChange: "not-json-anyway" }],
    ]
    for (const fields of badFields) {
      expect(validateFields(fields).success, `TS validator should reject ${JSON.stringify(fields)}`).toBe(false)
      expectSchemaInvalid(fields)
    }
    const badDocs: unknown[] = [
      { fields: [{ name: "a" }], theme: { nope: "#fff" } },
      { fields: [{ name: "a" }], variant: "wizard" },
      { fields: [{ name: "a" }], endpoint: "ftp://example.com/hook" },
      { fields: [{ name: "a" }], version: 2 },
    ]
    for (const doc of badDocs) {
      expect(validateDocument(doc).success, `TS validator should reject ${JSON.stringify(doc)}`).toBe(false)
      expectSchemaInvalid(doc)
    }
  })

  it("documents the duplicate-name divergence (TS-only check)", () => {
    const dupes = [{ name: "email" }, { name: "email" }]
    expect(validateFields(dupes).success).toBe(false)
    // JSON Schema cannot express cross-item uniqueness — accepted there.
    expectSchemaValid(dupes)
  })

  it("documents the cross-property range divergence (TS-only check)", () => {
    // min > max and minLength > maxLength need value comparison — JSON Schema can't express it.
    for (const fields of [
      [{ name: "a", type: "number", min: 10, max: 5 }],
      [{ name: "a", minLength: 5, maxLength: 2 }],
    ]) {
      expect(validateFields(fields).success).toBe(false)
      expectSchemaValid(fields)
    }
  })

  it("validates constraint shapes in both validators", () => {
    const good = [
      { name: "pw", type: "password", minLength: 8, maxLength: 64 },
      { name: "code", pattern: "^[A-Z]{3}$" },
      { name: "age", type: "number", min: 18, max: 120 },
    ]
    expect(validateFields(good).success).toBe(true)
    expectSchemaValid(good)
    const bad: unknown[][] = [
      [{ name: "a", minLength: -1 }],
      [{ name: "a", minLength: 1.5 }],
      [{ name: "a", min: "x" }],
    ]
    for (const fields of bad) {
      expect(validateFields(fields).success).toBe(false)
      expectSchemaInvalid(fields)
    }
    // Regex compilability is a TS-only semantic check (like duplicates):
    // JSON Schema sees `pattern` as an opaque string.
    expect(validateFields([{ name: "a", pattern: "(unclosed" }]).success).toBe(false)
    expectSchemaValid([{ name: "a", pattern: "(unclosed" }])
  })

  it("accepts full group conditions and string shorthand in both validators", () => {
    const fields = [
      "email",
      { name: "taxId", required: true, showIf: { all: [{ field: "country", equals: "US" }, { field: "plan", equals: "Pro" }] } },
      { name: "alt", showIf: { any: [{ field: "a", equals: 1 }, { field: "b", notEquals: null }] } },
    ]
    expect(validateFields(fields).success).toBe(true)
    expectSchemaValid(fields)
  })
})
