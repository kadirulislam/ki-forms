import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// React 18 + Testing Library: mark the environment so RTL's act() works
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// jsdom lacks ResizeObserver, which the Preview device frame uses to scale
// itself to the panel width. A no-op stub is enough: tests assert markup and
// container-query wiring, and real scaling is verified in a browser.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

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
