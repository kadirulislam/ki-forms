import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  root: "website",
  base: "/ki-forms/",
  plugins: [viteSingleFile()],
  build: {
    outDir: "../dist-demo",
    emptyOutDir: true,
  },
})
