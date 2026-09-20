import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// React 18 + Testing Library: mark the environment so RTL's act() works
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// jsdom lacks matchMedia; sonner's Toaster (studio) needs it
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// RTL auto-cleanup requires runner globals; vitest runs without them
afterEach(() => cleanup())
