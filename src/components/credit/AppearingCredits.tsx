"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CreditItem, CreditConfig, AnimationType } from "@/lib/credit/types"
import { getFontWeight, resolveAlignment } from "@/lib/credit/store"
import { getAppearItemDuration } from "@/lib/credit/appearing"
import { resolveTextShadow } from "@/lib/credit/text-shadow"
import { resolveTextBlur } from "@/lib/credit/text-blur"
import { resolveTextStyle } from "@/lib/credit/textStyle"

interface AppearingCreditsProps {
  items: CreditItem[]
  config: CreditConfig
  isPlaying: boolean
  restartKey: number
  // When provided (0-1), overrides internal animation and jumps to that point in the sequence.
  // Used for video export frame-by-frame capture.
  manualProgress?: number | null
  // Reports total duration in seconds (for export)
  onDurationChange?: (durationSec: number) => void
}

// Filter out spacer and divider items — they don't appear in this mode
function getVisibleItems(items: CreditItem[]): CreditItem[] {
  return items.filter((i) => i.type !== "spacer" && i.type !== "divider")
}

export interface AnimationTunables {
  slide: number // px traveled by slide-* variants
  blur: number // px blur for the blur variant
  zoomFrom: number // initial scale for zoom
  zoomTo: number // exit scale for zoom
}

// Get animation variants for the chosen type
export function getVariants(
  type: AnimationType,
  duration: number,
  { slide, blur, zoomFrom, zoomTo }: AnimationTunables,
) {
  const transition = { duration, ease: [0.4, 0, 0.2, 1] as const }
  switch (type) {
    case "fade":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition,
      }
    case "slide-up":
      return {
        initial: { opacity: 0, y: slide },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -slide },
        transition,
      }
    case "slide-down":
      return {
        initial: { opacity: 0, y: -slide },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: slide },
        transition,
      }
    case "slide-left":
      return {
        initial: { opacity: 0, x: slide },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -slide },
        transition,
      }
    case "slide-right":
      return {
        initial: { opacity: 0, x: -slide },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: slide },
        transition,
      }
    case "zoom":
      return {
        initial: { opacity: 0, scale: zoomFrom },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: zoomTo },
        transition,
      }
    case "blur":
      return {
        initial: { opacity: 0, filter: `blur(${blur}px)` },
        animate: { opacity: 1, filter: "blur(0px)" },
        exit: { opacity: 0, filter: `blur(${blur}px)` },
        transition,
      }
    case "typewriter":
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition,
      }
  }
}

// Pull the animation tunables out of config
function tunablesFromConfig(config: CreditConfig): AnimationTunables {
  return {
    slide: config.animSlideDistance,
    blur: config.animBlurAmount,
    zoomFrom: config.animZoomFrom,
    zoomTo: config.animZoomTo,
  }
}

function AppearItem({ item, config }: { item: CreditItem; config: CreditConfig }) {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = item.bold ? 700 : getFontWeight(item.type, config.fontWeight)
  const shadow = resolveTextShadow(config)
  const blur = resolveTextBlur(item, config)
  return (
    <div
      style={{
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
        maxWidth: "100%",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {item.text || "\u00A0"}
    </div>
  )
}

export function AppearingCredits({
  items,
  config,
  isPlaying,
  restartKey,
  manualProgress = null,
  onDurationChange,
}: AppearingCreditsProps) {
  const visibleItems = React.useMemo(() => getVisibleItems(items), [items])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [typedText, setTypedText] = React.useState("")

  // Compute per-item durations and total duration
  const itemDurations = React.useMemo(() => {
    return visibleItems.map((item) => getAppearItemDuration(item, config))
  }, [visibleItems, config.animationType, config.animationDuration, config.pauseDuration])

  const totalDuration = React.useMemo(
    () => itemDurations.reduce((sum, d) => sum + d, 0),
    [itemDurations],
  )

  // Report duration to parent
  React.useEffect(() => {
    if (onDurationChange) onDurationChange(totalDuration)
  }, [totalDuration, onDurationChange])

  // When manualProgress is provided, derive currentIndex and typedText from it
  React.useEffect(() => {
    if (manualProgress === null) return
    if (visibleItems.length === 0) return
    const targetTime = manualProgress * totalDuration
    let acc = 0
    let foundIdx = visibleItems.length - 1
    let timeIntoItem = 0
    for (let i = 0; i < itemDurations.length; i++) {
      if (acc + itemDurations[i] > targetTime) {
        foundIdx = i
        timeIntoItem = targetTime - acc
        break
      }
      acc += itemDurations[i]
    }
    if (foundIdx !== currentIndex) setCurrentIndex(foundIdx)
    // For typewriter, compute typed text
    if (config.animationType === "typewriter") {
      const item = visibleItems[foundIdx]
      const text = item.text || ""
      const typingDuration = Math.max(2, text.length * (config.typewriterSpeed / 1000))
      const charsToShow = Math.min(text.length, Math.floor((timeIntoItem / typingDuration) * text.length))
      setTypedText(text.slice(0, charsToShow))
    } else {
      setTypedText("")
    }
  }, [manualProgress, visibleItems, itemDurations, totalDuration, config.animationType, config.typewriterSpeed, currentIndex])

  // Reset on restart
  React.useEffect(() => {
    setCurrentIndex(0)
    setTypedText("")
  }, [restartKey])

  // Advance items based on timing (skip when manualProgress is provided)
  React.useEffect(() => {
    if (manualProgress !== null) return
    if (!isPlaying || visibleItems.length === 0) return
    if (currentIndex >= visibleItems.length) {
      if (config.loop) {
        const t = setTimeout(() => setCurrentIndex(0), config.pauseDuration * 1000)
        return () => clearTimeout(t)
      }
      return
    }
    const item = visibleItems[currentIndex]
    const itemDuration = getAppearItemDuration(item, config)

    const t = setTimeout(() => {
      setCurrentIndex((i) => i + 1)
      setTypedText("")
    }, itemDuration * 1000)
    return () => clearTimeout(t)
  }, [
    isPlaying,
    currentIndex,
    visibleItems,
    config.animationDuration,
    config.pauseDuration,
    config.loop,
    config.animationType,
    manualProgress,
  ])

  // Typewriter effect (skip in manual/export mode)
  React.useEffect(() => {
    if (manualProgress !== null) return
    if (!isPlaying) return
    if (config.animationType !== "typewriter") return
    if (currentIndex >= visibleItems.length) return
    const item = visibleItems[currentIndex]
    const text = item.text || ""
    setTypedText("")
    let i = 0
    const interval = setInterval(() => {
      i += 1
      setTypedText(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, config.typewriterSpeed)
    return () => clearInterval(interval)
  }, [isPlaying, currentIndex, visibleItems, config.animationType, config.typewriterSpeed, manualProgress])

  // Background
  const backgroundStyle: React.CSSProperties = config.useGradient
    ? {
        background: `linear-gradient(${config.gradientAngle}deg, ${config.gradientFrom}, ${config.gradientTo})`,
      }
    : { backgroundColor: config.backgroundColor }

  // Empty state
  if (visibleItems.length === 0) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={backgroundStyle}
      >
        <p style={{ color: config.textColor, opacity: 0.5 }}>
          No hay items para mostrar
        </p>
      </div>
    )
  }

  // Finished state
  if (currentIndex >= visibleItems.length && !config.loop) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={backgroundStyle}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1 }}
          style={{ color: config.textColor }}
        >
          Fin
        </motion.p>
      </div>
    )
  }

  const currentItem = visibleItems[Math.min(currentIndex, visibleItems.length - 1)]
  const variants = getVariants(config.animationType, config.animationDuration, tunablesFromConfig(config))

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative"
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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={variants.transition}
          className="w-full flex flex-col items-center justify-center px-4"
        >
          {config.animationType === "typewriter" ? (
            <div
              style={{
                fontFamily: resolveTextStyle(currentItem, config).fontFamily,
                fontSize: `${resolveTextStyle(currentItem, config).fontSize}px`,
                fontWeight: currentItem.bold
                  ? 700
                  : getFontWeight(currentItem.type, config.fontWeight),
                color: resolveTextStyle(currentItem, config).color,
                letterSpacing: `${resolveTextStyle(currentItem, config).letterSpacing}px`,
                lineHeight: resolveTextStyle(currentItem, config).lineHeight,
                textAlign: resolveAlignment(currentItem, config),
                textTransform: currentItem.uppercase ? "uppercase" : undefined,
                fontStyle: currentItem.italic ? "italic" : undefined,
                padding: `0 ${config.paddingX}px`,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: "1.5em",
                filter:
                  resolveTextBlur(currentItem, config) > 0
                    ? `blur(${resolveTextBlur(currentItem, config)}px)`
                    : undefined,
              }}
            >
              {typedText}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ display: "inline-block", marginLeft: "0.05em" }}
              >
                |
              </motion.span>
            </div>
          ) : (
            <AppearItem item={currentItem} config={config} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
