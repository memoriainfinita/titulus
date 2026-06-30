"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CreditItem, CreditConfig, AnimationType } from "@/lib/credit/types"
import { resolveAlignment, resolveFontWeight } from "@/lib/credit/store"
import {
  getAppearItemDuration,
  resolveAnimationType,
  resolveAnimationDuration,
  resolveAnimationTunables,
  resolveTypewriterSpeed,
  resolveLineRevealInterval,
  isLineStaggered,
  countItemLines,
  revealedLinesAt,
  typedCharsAt,
  AnimationTunables,
} from "@/lib/credit/appearing"
import { resolveTextShadow } from "@/lib/credit/text-shadow"
import { resolveTextBlur } from "@/lib/credit/text-blur"
import { resolveTextStyle } from "@/lib/credit/textStyle"
import { resolveImageWidth } from "@/lib/credit/image"
import { resolveSafeInset } from "@/lib/credit/safeMargins"
import { itemProgressBounds } from "@/lib/credit/timeline"

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
  // Timeline reporting (item-granular).
  onProgressChange?: (p: number) => void
  onIndexChange?: (i: number) => void
}

// Filter out spacer and divider items — they don't appear in this mode
export function getVisibleItems(items: CreditItem[]): CreditItem[] {
  return items.filter((i) => i.type !== "spacer" && i.type !== "divider")
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
    default:
      // `default` keeps render robust against legacy/unknown persisted types
      // (e.g. an old "lines" value) — they fall back to a plain fade.
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

function AppearItem({ item, config }: { item: CreditItem; config: CreditConfig }) {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = resolveFontWeight(item, config)
  const shadow = resolveTextShadow(item, config)
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
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
      }}
    >
      {item.text || "\u00A0"}
    </div>
  )
}

// Line-by-line reveal: renders each text line, revealing them as `revealedLines` grows.
// Lines accumulate top-to-bottom; each one enters with the item's animation `variants`
// (fade/blur/slide/zoom), so the reveal combines with the chosen animation type.
function LinesItem({
  item,
  config,
  revealedLines,
  variants,
}: {
  item: CreditItem
  config: CreditConfig
  revealedLines: number
  variants: ReturnType<typeof getVariants>
}) {
  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = resolveFontWeight(item, config)
  const shadow = resolveTextShadow(item, config)
  const blur = resolveTextBlur(item, config)
  const lines = (item.text || " ").split("\n")
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
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
      }}
    >
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={variants.initial}
          animate={i < revealedLines ? variants.animate : variants.initial}
          transition={variants.transition}
        >
          {line || " "}
        </motion.div>
      ))}
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
  onProgressChange,
  onIndexChange,
}: AppearingCreditsProps) {
  const visibleItems = React.useMemo(() => getVisibleItems(items), [items])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  // Manual-mode (export/scrub) derived state. Live playback is owned by the child items.
  const [manualTypedText, setManualTypedText] = React.useState("")
  const [manualRevealedLines, setManualRevealedLines] = React.useState(1)

  // Compute per-item durations and total duration
  const itemDurations = React.useMemo(() => {
    return visibleItems.map((item) => getAppearItemDuration(item, config))
  }, [visibleItems, config.animationType, config.animationDuration, config.pauseDuration, config.lineRevealInterval, config.typewriterSpeed])

  const totalDuration = React.useMemo(
    () => itemDurations.reduce((sum, d) => sum + d, 0),
    [itemDurations],
  )

  // Report duration to parent
  React.useEffect(() => {
    if (onDurationChange) onDurationChange(totalDuration)
  }, [totalDuration, onDurationChange])

  // Report item-granular progress and current index upward (timeline), not in manual mode.
  React.useEffect(() => {
    if (manualProgress !== null) return
    onIndexChange?.(currentIndex)
    const bounds = itemProgressBounds(itemDurations)
    const b = bounds[Math.min(currentIndex, bounds.length - 1)]
    if (b) onProgressChange?.(b.start)
  }, [currentIndex, manualProgress, itemDurations, onProgressChange, onIndexChange])

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
    const foundItem = visibleItems[foundIdx]
    const foundType = foundItem ? resolveAnimationType(foundItem, config) : null
    if (foundItem && foundType === "typewriter") {
      const text = foundItem.text || ""
      setManualTypedText(text.slice(0, typedCharsAt(timeIntoItem, text.length, resolveTypewriterSpeed(foundItem, config))))
    } else {
      setManualTypedText("")
    }
    if (foundItem && isLineStaggered(foundItem, config)) {
      setManualRevealedLines(
        revealedLinesAt(timeIntoItem, resolveLineRevealInterval(foundItem, config), countItemLines(foundItem)),
      )
    }
  }, [manualProgress, visibleItems, itemDurations, totalDuration, config, config.animationType, config.typewriterSpeed, config.staggerLines, config.lineRevealInterval, currentIndex])

  // Reset on restart
  React.useEffect(() => {
    setCurrentIndex(0)
    setManualTypedText("")
    setManualRevealedLines(1)
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
      setManualTypedText("")
      setManualRevealedLines(1)
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
  const currentAnimType = resolveAnimationType(currentItem, config)
  const variants = getVariants(
    currentAnimType,
    resolveAnimationDuration(currentItem, config),
    resolveAnimationTunables(currentItem, config),
  )
  const staggered = isLineStaggered(currentItem, config)
  // When revealing line by line, each line plays the animation itself, so the
  // outer container holds steady (like typewriter) to avoid animating twice.
  const containerVariants = staggered
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: variants.transition }
    : variants

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center overflow-hidden relative"
      style={{
        ...backgroundStyle,
        paddingLeft: `${resolveSafeInset(config) * 100}%`,
        paddingRight: `${resolveSafeInset(config) * 100}%`,
      }}
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
          initial={containerVariants.initial}
          animate={containerVariants.animate}
          exit={containerVariants.exit}
          transition={containerVariants.transition}
          className="w-full flex flex-col items-center justify-center px-4"
        >
          {currentItem.type === "image" ? (
            currentItem.imageSrc ? (
              <div className="w-full flex justify-center" style={{ padding: `0 ${config.paddingX}px` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentItem.imageSrc}
                  alt=""
                  style={{ width: `${resolveImageWidth(currentItem, config)}%`, height: "auto", maxWidth: "100%" }}
                />
              </div>
            ) : null
          ) : staggered ? (
            <LinesItem
              item={currentItem}
              config={config}
              revealedLines={manualRevealedLines}
              variants={variants}
            />
          ) : currentAnimType === "typewriter" ? (
            <div
              style={{
                fontFamily: resolveTextStyle(currentItem, config).fontFamily,
                fontSize: `${resolveTextStyle(currentItem, config).fontSize}px`,
                fontWeight: resolveFontWeight(currentItem, config),
                color: resolveTextStyle(currentItem, config).color,
                letterSpacing: `${resolveTextStyle(currentItem, config).letterSpacing}px`,
                lineHeight: resolveTextStyle(currentItem, config).lineHeight,
                textAlign: resolveAlignment(currentItem, config),
                textTransform: currentItem.uppercase ? "uppercase" : undefined,
                fontStyle: currentItem.italic ? "italic" : undefined,
                padding: `0 ${config.paddingX}px`,
                maxWidth: resolveTextStyle(currentItem, config).maxWidth,
                whiteSpace: resolveTextStyle(currentItem, config).whiteSpace,
                wordBreak: resolveTextStyle(currentItem, config).wordBreak,
                minHeight: "1.5em",
                filter:
                  resolveTextBlur(currentItem, config) > 0
                    ? `blur(${resolveTextBlur(currentItem, config)}px)`
                    : undefined,
              }}
            >
              {manualTypedText}
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
