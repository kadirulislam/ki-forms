import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Device frames for the Preview overlay.
 *
 * Drawn as inline SVG/CSS rather than shipped as images: Apple's hardware
 * photography is trademarked and cannot be bundled in an MIT package, and
 * bitmaps go soft when a 1280px frame is scaled into a panel. Vector chrome
 * stays sharp at any zoom, adds no network request, and works offline.
 *
 * The inner content is laid out at the device's true CSS width (390 / 834 /
 * 1280) and the whole frame is then scaled to fit. That matters: the
 * two-column `width: "half"` collapse is driven by a container query, so the
 * form has to experience a real 390px viewport to behave like a phone.
 */

export type DeviceKind = "desktop" | "tablet" | "mobile"

/** Real CSS pixel width of each device's screen. */
export const DEVICE_CONTENT_WIDTH: Record<DeviceKind, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
}

export const DEVICE_LABEL: Record<DeviceKind, string> = {
  desktop: "MacBook Pro",
  tablet: "iPad",
  mobile: "iPhone",
}

export const DEVICE_VIEWPORT_LABEL: Record<DeviceKind, string> = {
  desktop: "1280 × 800",
  tablet: "834 × 1112",
  mobile: "390 × 844",
}

/** Screen height shown, in device pixels.
 *
 *  Trimmed below real hardware so a short form is not marooned in a mostly-empty
 *  screen — but not so far that the frame stops reading as the device it claims
 *  to be. 1280 × 500 is a 2.56:1 letterbox, which looks like a banner, not a
 *  laptop. 720 keeps a believable 16:9 while still fitting a form comfortably.
 *  Width is what the container query depends on, so height stays free to tune. */
const SCREEN_HEIGHT: Record<DeviceKind, number> = {
  desktop: 720,
  tablet: 620,
  mobile: 620,
}

/** Bezel thickness in unscaled device pixels — deliberately thin. The iPad's
 *  uniform bezel is the thinnest of the three; a chunky one reads as a monitor. */
const BEZEL = { desktop: 10, tablet: 11, mobile: 10 } as const

/** MacBook only: the aluminium base is wider than the lid. */
const BASE_OVERHANG = 88

type DeviceFrameProps = {
  device: DeviceKind
  children: ReactNode
  /** Query container name so the form's own `@container` rules apply. */
  containerName?: string
}

export function DeviceFrame({ device, children, containerName }: DeviceFrameProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  const contentWidth = DEVICE_CONTENT_WIDTH[device]
  const screenHeight = SCREEN_HEIGHT[device]
  const baseHeight = device === "desktop" ? 14 : 0
  // Must match what each frame actually renders, or the scale is computed
  // against the wrong width and the frame overflows the modal.
  const frameWidth = contentWidth + BEZEL[device] * 2 + (device === "desktop" ? BASE_OVERHANG : 0)
  const frameHeight = screenHeight + BEZEL[device] * 2 + baseHeight

  // Scale down to fit whichever axis is tighter. Width alone is not enough: a
  // 1280px MacBook scaled to the panel width is still taller than the modal.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => {
      const styles = getComputedStyle(el)
      const availableW = el.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight)
      const availableH = el.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
      if (availableW <= 0) return
      const next = Math.min(1, availableW / frameWidth, availableH > 0 ? availableH / frameHeight : 1)
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [frameWidth, frameHeight])

  return (
    // `w-full min-w-0` is load-bearing: without an explicit width this flex item
    // sizes to its child, so the measurement that drives the scale reads back
    // the frame's own width and the scale pins at 1.
    <div ref={viewportRef} className="flex w-full min-w-0 flex-1 items-start justify-center overflow-auto p-4">
      <div style={{ width: frameWidth * scale, height: frameHeight * scale }} className="relative shrink-0">
        <div
          style={{ width: frameWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="absolute top-0 left-0"
        >
          {device === "desktop" ? (
            <MacBook contentWidth={contentWidth} screenHeight={screenHeight} containerName={containerName}>
              {children}
            </MacBook>
          ) : device === "tablet" ? (
            <TabletFrame contentWidth={contentWidth} screenHeight={screenHeight} containerName={containerName}>
              {children}
            </TabletFrame>
          ) : (
            <PhoneFrame contentWidth={contentWidth} screenHeight={screenHeight} containerName={containerName}>
              {children}
            </PhoneFrame>
          )}
        </div>
      </div>
    </div>
  )
}

/** Dark bezel used by all three frames. */
const BEZEL_BG = "linear-gradient(160deg, #3f3f46 0%, #27272a 45%, #18181b 100%)"

/**
 * The screen well: simultaneously the query container and the exact-width box
 * the form renders into. A max-width keeps the form readable on the 1280px
 * desktop frame — a real form page constrains its column, and inputs stretched
 * the full width of a laptop screen look broken.
 */
function Screen({
  width,
  height,
  containerName,
  radius,
  children,
}: {
  width: number
  height: number
  containerName?: string
  radius: number
  children: ReactNode
}) {
  return (
    <div
      style={containerName ? { width, containerName, containerType: "inline-size" } : { width }}
      data-device-screen={containerName ? containerName : undefined}
      className="overflow-hidden bg-background"
    >
      <div style={{ height, borderRadius: radius }} className="overflow-y-auto bg-background">
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-[560px] px-6 py-8">{children}</div>
        </div>
      </div>
    </div>
  )
}

function MacBook({
  contentWidth,
  screenHeight,
  containerName,
  children,
}: {
  contentWidth: number
  screenHeight: number
  containerName?: string
  children: ReactNode
}) {
  const bezel = BEZEL.desktop
  const lidWidth = contentWidth + bezel * 2
  const footWidth = lidWidth + BASE_OVERHANG
  const baseHeight = 14

  return (
    <div className="flex flex-col items-center" style={{ width: footWidth }}>
      {/* Lid */}
      <div
        className="relative"
        style={{
          width: lidWidth,
          padding: bezel,
          paddingTop: bezel + 2,
          borderRadius: "12px 12px 4px 4px",
          background: BEZEL_BG,
          boxShadow: "0 18px 40px -14px rgb(0 0 0 / 0.45)",
        }}
      >
        {/* Webcam in the bezel */}
        <div className="absolute top-[5px] left-1/2 size-[4px] -translate-x-1/2 rounded-full bg-zinc-700 ring-1 ring-zinc-500/50" />
        <Screen width={contentWidth} height={screenHeight} containerName={containerName} radius={3}>
          {children}
        </Screen>
      </div>

      {/* Aluminium base: a shallow wedge joined to the lid by a hinge notch. */}
      <div className="relative" style={{ width: footWidth, height: baseHeight, marginTop: -1 }}>
        <svg width={footWidth} height={baseHeight} viewBox={`0 0 ${footWidth} ${baseHeight}`} className="block" aria-hidden="true">
          <defs>
            <linearGradient id="ki-macbook-alu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4d4d8" />
              <stop offset="35%" stopColor="#a1a1aa" />
              <stop offset="85%" stopColor="#71717a" />
              <stop offset="100%" stopColor="#e4e4e7" />
            </linearGradient>
          </defs>
          {/* Hinge notch, centred under the lid */}
          <rect x={footWidth / 2 - 58} y="0" width="116" height="2.5" rx="1" fill="#3f3f46" />
          <path d={`M 10 2.5 H ${footWidth - 10} L ${footWidth} ${baseHeight} H 0 Z`} fill="url(#ki-macbook-alu)" />
        </svg>
      </div>
    </div>
  )
}

function TabletFrame({
  contentWidth,
  screenHeight,
  containerName,
  children,
}: {
  contentWidth: number
  screenHeight: number
  containerName?: string
  children: ReactNode
}) {
  const bezel = BEZEL.tablet

  return (
    <div
      className="relative"
      style={{
        width: contentWidth + bezel * 2,
        padding: bezel,
        borderRadius: 22,
        background: BEZEL_BG,
        boxShadow: "0 18px 40px -14px rgb(0 0 0 / 0.45)",
      }}
    >
      {/* Front camera, centred in the narrow bezel */}
      <div className="absolute top-[3px] left-1/2 size-[4px] -translate-x-1/2 rounded-full bg-zinc-700 ring-1 ring-zinc-500/50" />
      <Screen width={contentWidth} height={screenHeight} containerName={containerName} radius={8}>
        {children}
      </Screen>
    </div>
  )
}

function PhoneFrame({
  contentWidth,
  screenHeight,
  containerName,
  children,
}: {
  contentWidth: number
  screenHeight: number
  containerName?: string
  children: ReactNode
}) {
  const bezel = BEZEL.mobile
  const frameW = contentWidth + bezel * 2

  return (
    <div className="relative" style={{ width: frameW }}>
      {/* Side buttons */}
      <span className="absolute top-[110px] -left-[2px] h-12 w-[2.5px] rounded-l-sm bg-zinc-600" aria-hidden="true" />
      <span className="absolute top-[172px] -left-[2px] h-12 w-[2.5px] rounded-l-sm bg-zinc-600" aria-hidden="true" />
      <span className="absolute top-[150px] -right-[2px] h-16 w-[2.5px] rounded-r-sm bg-zinc-600" aria-hidden="true" />

      <div
        className="relative"
        style={{
          width: frameW,
          padding: bezel,
          borderRadius: 40,
          background: BEZEL_BG,
          boxShadow: "0 18px 40px -14px rgb(0 0 0 / 0.5)",
        }}
      >
        {/* Dynamic Island */}
        <div
          className="absolute top-[9px] left-1/2 z-20 -translate-x-1/2 bg-black"
          style={{ width: 82, height: 22, borderRadius: 12 }}
          aria-hidden="true"
        />
        <Screen width={contentWidth} height={screenHeight} containerName={containerName} radius={30}>
          {children}
        </Screen>
        {/* Home indicator, outside the scroll area so it stays pinned. */}
        <div className="absolute right-0 bottom-[5px] left-0 flex justify-center" aria-hidden="true">
          <span className="h-[4px] w-[104px] rounded-full bg-zinc-600" />
        </div>
      </div>
    </div>
  )
}
