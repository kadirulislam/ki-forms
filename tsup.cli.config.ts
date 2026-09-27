import { defineConfig } from "tsup"
import { readFileSync } from "node:fs"

/** Read at build time rather than importing JSON, which bundlers treat inconsistently. */
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string }
const schemaJson = readFileSync(new URL("./schema/ki-form.schema.json", import.meta.url), "utf8")

/**
 * CLI + MCP bundles. Kept separate from the library build so the published
 * runtime entry stays free of Node built-ins, and so the bins get a shebang
 * plus build-time constants inlined.
 */
export default defineConfig({
  entry: ["src/cli.ts", "src/mcp.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  // The library build writes to the same directory; never wipe its output.
  clean: false,
  dts: false,
  sourcemap: false,
  // No `banner`: esbuild already preserves the hashbang in each entry, and
  // adding one here too emits a duplicated shebang.
  define: {
    __KI_FORMS_VERSION__: JSON.stringify(pkg.version),
    // Inlined so the MCP `resources/read` handler needs no filesystem access.
    __KI_FORM_SCHEMA_JSON__: JSON.stringify(schemaJson),
  },
})
