"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { CreditItem, CreditConfig } from "@/lib/credit/types"
import { resolveAlignment, resolveFontWeight } from "@/lib/credit/store"
import { getScrollDurationSec, getScrollTranslateY, stepScrollProgress } from "@/lib/credit/scroll"
import { resolveSpacerHeight, resolveDivider } from "@/lib/credit/separators"
import { resolveTextShadow } from "@/lib/credit/text-shadow"
import { resolveTextBlur } from "@/lib/credit/text-blur"
import { resolveTextStyle } from "@/lib/credit/textStyle"
import { resolveImageWidth } from "@/lib/credit/image"
import { resolveSafeInset } from "@/lib/credit/safeMargins"

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
  // Reports current progress (0-1) during internal playback (for the timeline).
  onProgressChange?: (p: number) => void
  // Reports per-item geometry (offsets) plus content/container heights, so the
  // parent can map items to scroll progress (seek + active-item highlight).
  onLayoutChange?: (layout: {
    offsets: { id: string; top: number; height: number }[]
    contentHeight: number
    containerHeight: number
  }) => void
}

// Build the inline style for an individual credit item
function getItemStyle(item: CreditItem, config: CreditConfig): React.CSSProperties {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = resolveFontWeight(item, config)

  const shadow = resolveTextShadow(item, config)
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
    maxWidth: ts.maxWidth,
    marginLeft: "auto",
    marginRight: "auto",
    boxSizing: "border-box",
    whiteSpace: ts.whiteSpace,
    wordBreak: ts.wordBreak,
  }
}

// Render a single item, including dividers and spacers
const CreditLine = React.forwardRef<HTMLDivElement, { item: CreditItem; config: CreditConfig }>(
  function CreditLine({ item, config }, ref) {
  if (item.type === "spacer") {
    return <div ref={ref} style={{ height: `${resolveSpacerHeight(item, config)}px` }} aria-hidden />
  }
  if (item.type === "image") {
    if (!item.imageSrc) return <div ref={ref} aria-hidden />
    const align = resolveAlignment(item, config)
    return (
      <div
        ref={ref}
        style={{
          padding: `0 ${config.paddingX}px`,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          margin: `${config.itemSpacing}px 0`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageSrc}
          alt=""
          style={{ width: `${resolveImageWidth(item, config)}%`, height: "auto", maxWidth: "100%" }}
        />
      </div>
    )
  }
  if (item.type === "divider") {
    const align = resolveAlignment(item, config)
    const d = resolveDivider(item, config)
    return (
      <div
        ref={ref}
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
      ref={ref}
      style={{
        ...getItemStyle(item, config),
        marginTop: `${config.itemSpacing}px`,
        marginBottom: `${config.itemSpacing}px`,
      }}
    >
      {item.text || "\u00A0"}
    </div>
  )
})

export function ScrollCredits({
  items,
  config,
  isPlaying,
  restartKey,
  manualProgress = null,
  onDurationChange,
  onProgressChange,
  onLayoutChange,
}: ScrollCreditsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const itemEls = React.useRef<Map<string, HTMLDivElement>>(new Map())
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
        const ch = contentRef.current.scrollHeight
        const cont = containerRef.current.clientHeight
        setContentHeight(ch)
        setContainerHeight(cont)
        if (onLayoutChange) {
          // Only items with a real box: excludes the src-less image (height 0),
          // which could otherwise be flagged "active" for an instant in the gap.
          const offsets = items
            .map((it) => {
              const el = itemEls.current.get(it.id)
              return { id: it.id, top: el?.offsetTop ?? 0, height: el?.offsetHeight ?? 0 }
            })
            .filter((o) => o.height > 0)
          onLayoutChange({ offsets, contentHeight: ch, containerHeight: cont })
        }
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(contentRef.current)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [items, config, onLayoutChange])

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
    let stopped = false
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
            // No loop: kill the RAF loop instead of spinning at progress 1 forever.
            stopped = true
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
      if (!stopped) raf = requestAnimationFrame(tick)
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

  // Report internal progress upward (timeline), but not in manual/export mode.
  React.useEffect(() => {
    if (manualProgress !== null) return
    onProgressChange?.(internalProgress)
  }, [internalProgress, manualProgress, onProgressChange])

  // When leaving manual mode (scrub release -> Play), resume from the scrubbed point.
  const lastManualRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (manualProgress !== null) {
      lastManualRef.current = manualProgress
      return
    }
    if (lastManualRef.current !== null) {
      setInternalProgress(lastManualRef.current)
      lastManualRef.current = null
    }
  }, [manualProgress])

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
        className="absolute"
        style={{
          left: `${resolveSafeInset(config) * 100}%`,
          right: `${resolveSafeInset(config) * 100}%`,
          transform: `translate3d(0, ${translateY}px, 0)`,
          willChange: "transform",
        }}
      >
        {items.map((item) => (
          <CreditLine
            key={item.id}
            item={item}
            config={config}
            ref={(el) => {
              if (el) itemEls.current.set(item.id, el)
              else itemEls.current.delete(item.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}
