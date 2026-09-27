import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // The Studio suites mount the whole App (dnd-kit + Radix + lucide) in jsdom.
    // A cold first mount costs 5-6s on modest hardware, which overran vitest's
    // 5s default and failed "mounts the shell" on a timing basis alone. Most
    // tests here finish in well under 1s, so a 15s ceiling still catches real
    // hangs rather than papering over them.
    testTimeout: 15000,
  },
})
