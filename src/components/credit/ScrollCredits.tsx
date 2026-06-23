"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CreditItem, CreditConfig, CreditItemType } from "@/lib/credit/types"
import { getFontWeight, resolveAlignment } from "@/lib/credit/store"
import { getScrollDurationSec, getScrollTranslateY, stepScrollProgress } from "@/lib/credit/scroll"
import { resolveSpacerHeight, resolveDivider } from "@/lib/credit/separators"
import { resolveTextShadow } from "@/lib/credit/text-shadow"
import { resolveTextBlur } from "@/lib/credit/text-blur"
import { resolveTextStyle } from "@/lib/credit/textStyle"

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
  const ts = resolveTextStyle(item, config)
  const fontWeight = getFontWeight(item.type, config.fontWeight)

  const shadow = resolveTextShadow(config)
  const blur = resolveTextBlur(item, config)

  return {
    fontFamily: ts.fontFamily,
    fontSize: `${ts.fontSize}px`,
    fontWeight,
    color: ts.color,
    letterSpacing: `${ts.letterSpacing}px`,
    lineHeight: ts.lineHeight,
    textAlign: align,
    textShadow: shadow,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
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
    return <div style={{ height: `${resolveSpacerHeight(item, config)}px` }} aria-hidden />
  }
  if (item.type === "divider") {
    const align = resolveAlignment(item, config)
    const d = resolveDivider(item, config)
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
            width: `${d.width}%`,
            borderTopWidth: `${d.thickness}px`,
            borderTopStyle: d.style,
            borderTopColor: d.color,
            opacity: d.opacity,
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
    let pauseTimer: ReturnType<typeof setTimeout> | null = null
    let lastTime = performance.now()
    const durationSec = getScrollDurationSec(contentHeight, containerHeight, config.scrollSpeed)
    const endPauseSec = config.endPause

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now
      setInternalProgress((prev) => {
        const step = stepScrollProgress(prev, delta, durationSec, config.loop, endPauseSec)
        switch (step.kind) {
          case "run":
            return step.progress
          case "stop":
            return 1
          case "wrap":
            return 0
          case "pause":
            // Hold at the end and schedule a single restart after the pause.
            // The tick runs every frame, so guard against piling up timers.
            if (pauseTimer === null) {
              pauseTimer = setTimeout(() => {
                pauseTimer = null
                setInternalProgress(0)
              }, endPauseSec * 1000)
            }
            return 1
        }
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (pauseTimer !== null) clearTimeout(pauseTimer)
    }
  }, [isPlaying, contentHeight, containerHeight, config.scrollSpeed, config.endPause, config.loop, restartKey, manualProgress])

  // Report duration to parent (for export)
  React.useEffect(() => {
    if (!onDurationChange) return
    const durationSec = getScrollDurationSec(contentHeight, containerHeight, config.scrollSpeed)
    onDurationChange(durationSec + config.endPause)
  }, [contentHeight, containerHeight, config.scrollSpeed, config.endPause, onDurationChange])

  // Calculate translateY
  const translateY = getScrollTranslateY(
    contentHeight,
    containerHeight,
    config.scrollDirection,
    progress,
  )

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
      {config.vignetteEnabled && (
        <>
          {/* Top fade */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-10"
            style={{
              height: `${config.vignetteHeight}%`,
              background: config.useGradient
                ? `linear-gradient(to bottom, ${config.gradientFrom}, transparent)`
                : `linear-gradient(to bottom, ${config.backgroundColor}, transparent)`,
            }}
          />
          {/* Bottom fade */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
            style={{
              height: `${config.vignetteHeight}%`,
              background: config.useGradient
                ? `linear-gradient(to top, ${config.gradientTo}, transparent)`
                : `linear-gradient(to top, ${config.backgroundColor}, transparent)`,
            }}
          />
        </>
      )}
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
      </div>
    </div>
  )
}
