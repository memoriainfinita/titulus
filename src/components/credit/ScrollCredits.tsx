"use client"

import * as React from "react"
import { CreditItem, CreditConfig, OverlayLayer } from "@/lib/credit/types"
import { cn } from "@/lib/utils"
import { resolveAlignment } from "@/lib/credit/store"
import { getScrollDurationSec, getScrollTranslateY, stepScrollProgress } from "@/lib/credit/scroll"
import { resolveSpacerHeight, resolveDivider } from "@/lib/credit/separators"
import { resolveTextShadow } from "@/lib/credit/text-shadow"
import { resolveTextBlur } from "@/lib/credit/text-blur"
import { resolveTextStyle } from "@/lib/credit/textStyle"
import { resolveImageWidth } from "@/lib/credit/image"
import { resolveSafeInset } from "@/lib/credit/safeMargins"
import { resolveBackgroundStyle } from "@/lib/credit/background"
import { resolveOverlay, overlayStartSec, overlayOpacityAt } from "@/lib/credit/overlay"
import { Box, visibleRange, leadingSpacerHeight } from "@/lib/credit/virtualize"
import { RichText } from "./RichText"

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
  // Export stage only: with manualProgress set, render just the items near the stage.
  virtualize?: boolean
}

// Build the inline style for an individual credit item
function getItemStyle(item: CreditItem, config: CreditConfig): React.CSSProperties {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = config.fontWeight

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

// Top margin CreditLine gives each item; must match its styles below.
function marginTopOf(item: CreditItem, config: CreditConfig): number {
  if (item.type === "text" || item.type === "divider") return config.itemSpacing
  if (item.type === "image") return item.imageSrc ? config.itemSpacing : 0
  return 0
}

// Render a single item, including dividers and spacers
const CreditLine = React.forwardRef<HTMLDivElement, { item: CreditItem; config: CreditConfig }>(
  function CreditLine({ item, config }, ref) {
  if (item.type === "spacer") {
    return <div ref={ref} style={{ height: `${resolveSpacerHeight(item, config)}px` }} aria-hidden />
  }
  if (item.type === "overlay") {
    // Zero-height marker: only its position in the flow matters (see OverlayLayer).
    return <div ref={ref} style={{ height: 0 }} aria-hidden />
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
  const fontWeight = config.fontWeight
  return (
    <div
      ref={ref}
      style={{
        ...getItemStyle(item, config),
        marginTop: `${config.itemSpacing}px`,
        marginBottom: `${config.itemSpacing}px`,
      }}
    >
      {item.rich ? (
        <RichText rich={item.rich} baseWeight={fontWeight} />
      ) : (
        item.text || "\u00A0"
      )}
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
  virtualize = false,
}: ScrollCreditsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const itemEls = React.useRef<Map<string, HTMLDivElement>>(new Map())
  const [contentHeight, setContentHeight] = React.useState(0)
  const [containerHeight, setContainerHeight] = React.useState(0)
  const [internalProgress, setInternalProgress] = React.useState(0)
  // Measured box of every item (full layout), for overlay triggers and export windowing.
  const [boxes, setBoxes] = React.useState<Record<string, Box>>({})

  // Use manual progress if provided, otherwise use internal
  const progress = manualProgress !== null ? manualProgress : internalProgress

  // While exporting, render only the items near the stage. Geometry comes from
  // the last full measurement, which stays frozen so the spacer can't alter it.
  const windowed = virtualize && manualProgress !== null && items.every((it) => it.id in boxes)
  const frozenRef = React.useRef(false)
  React.useLayoutEffect(() => {
    frozenRef.current = windowed
  }, [windowed])

  // Measure content height after render
  React.useEffect(() => {
    if (!contentRef.current || !containerRef.current) return
    const measure = () => {
      if (frozenRef.current) return
      if (contentRef.current && containerRef.current) {
        const ch = contentRef.current.scrollHeight
        const cont = containerRef.current.clientHeight
        setContentHeight(ch)
        setContainerHeight(cont)
        const next: Record<string, Box> = {}
        for (const it of items) {
          const el = itemEls.current.get(it.id)
          next[it.id] = { top: el?.offsetTop ?? 0, height: el?.offsetHeight ?? 0 }
        }
        setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
        if (onLayoutChange) {
          // Only items with a real box: excludes the src-less image (height 0),
          // which could otherwise be flagged "active" for an instant in the gap.
          // Overlay markers are kept on purpose: their row lights up when they trigger.
          const offsets = items
            .map((it) => {
              const el = itemEls.current.get(it.id)
              return { id: it.id, type: it.type, top: el?.offsetTop ?? 0, height: el?.offsetHeight ?? 0 }
            })
            .filter((o) => o.height > 0 || o.type === "overlay")
            .map(({ id, top, height }) => ({ id, top, height }))
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional al reiniciar la preview; patrón verificado
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
  const backgroundStyle = resolveBackgroundStyle(config)

  // Half a stage of margin keeps shadows and blur that bleed past an item's box.
  const range = windowed
    ? visibleRange(items.map((it) => boxes[it.id]), translateY, containerHeight, containerHeight / 2)
    : null
  const renderedItems = !windowed ? items : range ? items.slice(range.first, range.last + 1) : []

  // Overlay images. Paint order: background > back overlays > credits >
  // vignette (z-10) > front overlays (z-20).
  const scrollSec = getScrollDurationSec(contentHeight, containerHeight, config.scrollSpeed)
  const renderOverlays = (layer: OverlayLayer) =>
    items.map((item) => {
      if (item.type !== "overlay" || !item.imageSrc || !(item.id in boxes)) return null
      const o = resolveOverlay(item)
      if (o.layer !== layer) return null
      const start = overlayStartSec(boxes[item.id].top, contentHeight, containerHeight, config.scrollDirection, scrollSec)
      const opacity = overlayOpacityAt(progress * scrollSec, start, o.duration, o.fade)
      // Not rendered while hidden: keeps invisible images out of each export frame.
      if (opacity <= 0) return null
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={item.id}
          src={item.imageSrc}
          alt=""
          className={cn("absolute pointer-events-none", layer === "front" && "z-20")}
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: `${resolveImageWidth(item, config)}%`,
            height: "auto",
            transform: "translate(-50%, -50%)",
            opacity,
          }}
        />
      )
    })

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={backgroundStyle}
    >
      {renderOverlays("back")}
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
        data-scroll-content
        className="absolute"
        style={{
          left: `${resolveSafeInset(config) * 100}%`,
          right: `${resolveSafeInset(config) * 100}%`,
          transform: `translate3d(0, ${translateY}px, 0)`,
          willChange: "transform",
        }}
      >
        {range && range.first > 0 && (
          <div
            style={{ height: `${leadingSpacerHeight(boxes[items[range.first].id].top, marginTopOf(items[range.first], config))}px` }}
            aria-hidden
          />
        )}
        {renderedItems.map((item) => (
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
      {renderOverlays("front")}
    </div>
  )
}
