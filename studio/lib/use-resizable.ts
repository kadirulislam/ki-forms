import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Drag-to-resize for the Preview dialog.
 *
 * The Preview is the one Studio modal whose size is a matter of taste: a
 * desktop frame wants width, a phone frame does not, and neither wants to be
 * resized to 4% scale. Hard-coding one size makes someone reach for the browser
 * zoom every time.
 *
 * Handles are the conventional bottom-right corner plus the right and bottom
 * edges. Pointer capture is used rather than window listeners so a fast drag
 * that leaves the handle keeps tracking, and so the drag ends cleanly even if
 * the cursor is released outside the dialog.
 *
 * The size is persisted, and re-clamped against the viewport on every window
 * resize — a size saved on a large display must not open off-screen on a
 * laptop.
 */

export type Size = { width: number; height: number }

/** Below this the device frame stops being readable, so it is a hard floor. */
export const MIN_SIZE: Size = { width: 360, height: 320 }

/** Breathing room between the dialog and the viewport edge. */
export const VIEWPORT_MARGIN = 16

export type Bounds = { maxWidth: number; maxHeight: number }

export function viewportBounds(): Bounds {
  if (typeof window === "undefined") return { maxWidth: 1920, maxHeight: 1080 }
  return {
    maxWidth: Math.max(MIN_SIZE.width, window.innerWidth - VIEWPORT_MARGIN * 2),
    maxHeight: Math.max(MIN_SIZE.height, window.innerHeight - VIEWPORT_MARGIN * 2),
  }
}

/**
 * Clamp a size to the floor and the viewport.
 *
 * Exported and pure: the arithmetic is where an off-screen or unusably small
 * dialog would come from, and it is far cheaper to test than to eyeball.
 */
export function clampSize(size: Size, bounds: Bounds = viewportBounds()): Size {
  // The floor is applied to the *bound* as well as the value, so a viewport
  // smaller than the floor still yields a usable dialog rather than a sliver.
  // `viewportBounds` already guarantees this, but clamping here too means the
  // guarantee does not depend on the caller.
  const maxWidth = Math.max(bounds.maxWidth, MIN_SIZE.width)
  const maxHeight = Math.max(bounds.maxHeight, MIN_SIZE.height)
  // A non-finite size would poison the layout and is unrecoverable through the
  // UI, so it collapses to the floor instead of propagating NaN.
  const safe = (value: number, floor: number, max: number) =>
    Math.round(Math.min(Math.max(Number.isFinite(value) ? value : floor, floor), max))
  return {
    width: safe(size.width, MIN_SIZE.width, maxWidth),
    height: safe(size.height, MIN_SIZE.height, maxHeight),
  }
}

function readStored(key: string | undefined): Size | null {
  if (!key || typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object") return null
    const p = parsed as Record<string, unknown>
    if (typeof p.width !== "number" || typeof p.height !== "number") return null
    if (!Number.isFinite(p.width) || !Number.isFinite(p.height)) return null
    return { width: p.width, height: p.height }
  } catch {
    return null
  }
}

type DragState = { startX: number; startY: number; start: Size; dir: string }

/** Which edges a handle controls: `e`, `s`, or `es`. */
export type ResizeDir = "e" | "s" | "es"

export type ResizableState = {
  size: Size
  /** Inline sizing for the dialog panel. Beats the `max-w-*`/`max-h-*` classes. */
  style: { width: number; height: number; maxWidth: number; maxHeight: number }
  startResize: (dir: ResizeDir) => (event: React.PointerEvent<HTMLElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void
  /** Keyboard equivalent of a drag, in pixels. */
  nudge: (dx: number, dy: number) => void
  reset: () => void
  isResized: boolean
}

export function useResizable(initial: Size, storageKey?: string): ResizableState {
  const [size, setSize] = useState<Size>(() => {
    const stored = readStored(storageKey)
    // Clamp on read: the stored value may predate a smaller window.
    return clampSize(stored ?? initial)
  })
  const drag = useRef<DragState | null>(null)
  const baseline = clampSize(initial)

  const write = useCallback(
    (next: Size) => {
      setSize(next)
      if (storageKey && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          // A full or blocked storage quota is not worth failing a resize over.
        }
      }
    },
    [storageKey],
  )

  // A saved size can outgrow a smaller window (external monitor -> laptop).
  useEffect(() => {
    const onWindowResize = () => {
      setSize((current) => {
        const next = clampSize(current)
        if (next.width === current.width && next.height === current.height) return current
        return next
      })
    }
    window.addEventListener("resize", onWindowResize)
    return () => window.removeEventListener("resize", onWindowResize)
  }, [])

  const startResize = useCallback(
    (dir: ResizeDir) => (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget
      try {
        target.setPointerCapture(event.pointerId)
      } catch {
        // Capture is an optimisation; dragging still works without it.
      }
      // A drag across the page would otherwise select the text it passes over.
      if (typeof document !== "undefined") document.body.style.userSelect = "none"
      drag.current = { startX: event.clientX, startY: event.clientY, start: size, dir }
    },
    [size],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const state = drag.current
      if (!state) return
      event.preventDefault()
      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      const next: Size = { width: state.start.width, height: state.start.height }
      if (state.dir.includes("e")) next.width += dx
      if (state.dir.includes("s")) next.height += dy
      write(clampSize(next))
    },
    [write],
  )

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    drag.current = null
    if (typeof document !== "undefined") document.body.style.userSelect = ""
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // Already released.
    }
  }, [])

  // If the dialog unmounts mid-drag, the selection guard must not survive it.
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") document.body.style.userSelect = ""
    }
  }, [])

  const reset = useCallback(() => write(baseline), [write, baseline])

  const nudge = useCallback(
    (dx: number, dy: number) => write(clampSize({ width: size.width + dx, height: size.height + dy })),
    [write, size.width, size.height],
  )

  const bounds = viewportBounds()
  return {
    size,
    // maxWidth/maxHeight must be set alongside width/height: the dialog carries
    // `max-w-[calc(100vw-2rem)]` and `sm:max-h-[min(85dvh,…)]` classes that would
    // otherwise cap an explicitly sized dialog.
    style: { width: size.width, height: size.height, maxWidth: bounds.maxWidth, maxHeight: bounds.maxHeight },
    startResize,
    onPointerMove,
    onPointerUp,
    nudge,
    reset,
    isResized: size.width !== baseline.width || size.height !== baseline.height,
  }
}
