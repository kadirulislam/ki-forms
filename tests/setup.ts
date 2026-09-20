import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// React 18 + Testing Library: mark the environment so RTL's act() works
;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true

// RTL auto-cleanup requires runner globals; vitest runs without them
afterEach(() => cleanup())
