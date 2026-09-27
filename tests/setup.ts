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

// Radix modal overlays — the canvas context menu, the dropdowns — render through
// a focus scope that calls `hideOthers`: while one is open it sets
// `aria-hidden="true"` on every sibling and `pointer-events: none` on the body.
// jsdom never tears that down, so the markers leak into the *next* test: the
// newly opened menu lands inside a subtree still marked aria-hidden, and
// Testing Library's `getByRole` skips aria-hidden subtrees — so the test fails
// on leaked state rather than on anything it asserts. Symptom: the first
// context-menu test in a file passes and every later one cannot find the menu.
//
// Only these markers are reset. Running in afterEach means it cannot mask an
// accessibility defect: axe evaluates during the test, before this point.
afterEach(() => {
  // Some suites opt into the node environment (`// @vitest-environment node`),
  // where there is no DOM at all — hence the guard.
  if (typeof document === "undefined") return
  document.body.style.pointerEvents = ""
  for (const el of Array.from(document.querySelectorAll('[aria-hidden="true"]'))) {
    el.removeAttribute("aria-hidden")
  }
})
