import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import { resolve } from "path"

export default defineConfig({
  root: resolve(__dirname, "demo"),
  plugins: [viteSingleFile()],
  build: {
    outDir: resolve(__dirname, "dist-demo"),
    emptyOutDir: true,
  },
})
