import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import { fileURLToPath } from "url"

const root = fileURLToPath(new URL("./studio", import.meta.url))

export default defineConfig({
  root,
  plugins: [viteSingleFile()],
  build: {
    outDir: fileURLToPath(new URL("./dist-demo/studio", import.meta.url)),
    emptyOutDir: true,
  },
})
