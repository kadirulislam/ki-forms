import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"

const root = fileURLToPath(new URL("./studio", import.meta.url))

// Tailwind/shadcn power the studio chrome only — the demo build stays dependency-free.
export default defineConfig({
  root,
  plugins: [viteSingleFile(), tailwindcss()],
  build: {
    outDir: fileURLToPath(new URL("./dist-demo/studio", import.meta.url)),
    emptyOutDir: true,
  },
})
