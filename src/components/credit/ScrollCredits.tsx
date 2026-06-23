"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CreditItem, CreditConfig, CreditItemType } from "@/lib/credit/types"
import { getFontSize, getFontWeight, resolveAlignment } from "@/lib/credit/store"

interface ScrollCreditsProps {
  items: CreditItem[]
  config: CreditConfig
  isPlaying: boolean
  restartKey: number
  // When provided, overrides internal animation and sets progress directly (0-1)
  // Used for video export frame-by-frame capture
  manualProgress?: number | null
  // When true, exposes the measured duration (in seconds) via onDurationChange
  onDurationChange?: (durationSec: number) => void
}

// Build the inline style for an individual credit item
function getItemStyle(item: CreditItem, config: CreditConfig): React.CSSProperties {
  const align = resolveAlignment(item, config)
  const fontSize = getFontSize(item.type, config)
  const fontWeight = getFontWeight(item.type, config.fontWeight)

  let shadow: string | undefined
  if (config.useTextShadow && item.type !== "spacer" && item.type !== "divider") {
    shadow = `${config.textShadowX}px ${config.textShadowY}px ${config.textShadowBlur}px ${config.textShadowColor}`
  }

  return {
    fontFamily: config.fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight,
    color: config.textColor,
    letterSpacing: `${config.letterSpacing}px`,
    lineHeight: config.lineHeight,
    textAlign: align,
    textShadow: shadow,
    textTransform: item.uppercase ? "uppercase" : undefined,
    fontStyle: item.italic ? "italic" : undefined,
    padding: `0 ${config.paddingX}px`,
    width: "100%",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  }
}

// Render a single item, including dividers and spacers
function CreditLine({ item, config }: { item: CreditItem; config: CreditConfig }) {
  if (item.type === "spacer") {
    return <div style={{ height: `${config.itemSpacing * 2}px` }} aria-hidden />
  }
  if (item.type === "divider") {
    const align = resolveAlignment(item, config)
    return (
      <div
        style={{
          padding: `0 ${config.paddingX}px`,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          margin: `${config.itemSpacing}px 0`,
        }}
      >
        <div
          style={{
            width: "60%",
            height: "1px",
            background: config.textColor,
            opacity: 0.4,
          }}
        />
      </div>
    )
  }
  return (
    <div
      style={{
        ...getItemStyle(item, config),
        marginTop: `${config.itemSpacing}px`,
        marginBottom: `${config.itemSpacing}px`,
        fontWeight: item.bold ? 700 : getFontWeight(item.type, config.fontWeight),
      }}
    >
      {item.text || "\u00A0"}
    </div>
  )
}

export function ScrollCredits({
  items,
  config,
  isPlaying,
  restartKey,
  manualProgress = null,
  onDurationChange,
}: ScrollCreditsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = React.useState(0)
  const [containerHeight, setContainerHeight] = React.useState(0)
  const [internalProgress, setInternalProgress] = React.useState(0)

  // Use manual progress if provided, otherwise use internal
  const progress = manualProgress !== null ? manualProgress : internalProgress

  // Measure content height after render
  React.useEffect(() => {
    if (!contentRef.current || !containerRef.current) return
    const measure = () => {
      if (contentRef.current && containerRef.current) {
        setContentHeight(contentRef.current.scrollHeight)
        setContainerHeight(containerRef.current.clientHeight)
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(contentRef.current)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [items, config])

  // Reset progress on restart
  React.useEffect(() => {
    setInternalProgress(0)
  }, [restartKey])

  // Skip internal animation when manual progress is provided (export mode)
  React.useEffect(() => {
    if (manualProgress !== null) return
    if (!isPlaying) return
    let raf: number
    let lastTime = performance.now()
    const totalDistance = contentHeight + containerHeight
    const durationSec = totalDistance > 0 ? totalDistance / config.scrollSpeed : 0
    const endPauseSec = config.endPause

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now
      setInternalProgress((prev) => {
        const increment = (1 / durationSec) * delta
        const next = prev + increment
        if (next >= 1) {
          // End pause then loop
          if (endPauseSec > 0) {
            // schedule restart after pause
            setTimeout(() => setInternalProgress(0), endPauseSec * 1000)
            return 1
          }
          return 0
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, contentHeight, containerHeight, config.scrollSpeed, config.endPause, restartKey, manualProgress])

  // Report duration to parent (for export)
  React.useEffect(() => {
    if (!onDurationChange) return
    const totalDistance = contentHeight + containerHeight
    const durationSec = totalDistance > 0 ? totalDistance / config.scrollSpeed : 0
    onDurationChange(durationSec + config.endPause)
  }, [contentHeight, containerHeight, config.scrollSpeed, config.endPause, onDurationChange])

  // Calculate translateY
  const totalDistance = contentHeight + containerHeight
  const translateY = config.scrollDirection === "up"
    ? containerHeight - progress * totalDistance
    : -contentHeight + progress * totalDistance

  // Background style
  const backgroundStyle: React.CSSProperties = config.useGradient
    ? {
        background: `linear-gradient(${config.gradientAngle}deg, ${config.gradientFrom}, ${config.gradientTo})`,
      }
    : { backgroundColor: config.backgroundColor }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={backgroundStyle}
    >
      {/* Top fade */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-10"
        style={{
          height: "20%",
          background: config.useGradient
            ? `linear-gradient(to bottom, ${config.gradientFrom}, transparent)`
            : `linear-gradient(to bottom, ${config.backgroundColor}, transparent)`,
        }}
      />
      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{
          height: "20%",
          background: config.useGradient
            ? `linear-gradient(to top, ${config.gradientTo}, transparent)`
            : `linear-gradient(to top, ${config.backgroundColor}, transparent)`,
        }}
      />
      <div
        ref={contentRef}
        className="absolute left-0 right-0"
        style={{
          transform: `translate3d(0, ${translateY}px, 0)`,
          willChange: "transform",
        }}
      >
        {items.map((item) => (
          <CreditLine key={item.id} item={item} config={config} />
        ))}
        {/* Bottom padding so last item scrolls off-screen above */}
        <div style={{ height: containerHeight }} />
      </div>
    </div>
  )
}
