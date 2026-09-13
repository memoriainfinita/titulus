"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CreditItem, CreditConfig, AnimationType } from "@/lib/credit/types"
import { resolveAlignment } from "@/lib/credit/store"
import { RichText, LineSpans } from "./RichText"
import { sliceRuns, plainToRich } from "@/lib/credit/rich"
import {
  getAppearItemDuration,
  resolveAnimationType,
  resolveAnimationDuration,
  resolveAnimationTunables,
  resolveTypewriterSpeed,
  resolveLineRevealInterval,
  isLineStaggered,
  countItemLines,
  typedCharsAt,
  manualAppearStyle,
  AnimationTunables,
} from "@/lib/credit/appearing"
import { resolveTextShadow } from "@/lib/credit/text-shadow"
import { resolveTextBlur } from "@/lib/credit/text-blur"
import { resolveTextStyle } from "@/lib/credit/textStyle"
import { resolveImageWidth } from "@/lib/credit/image"
import { resolveSafeInset } from "@/lib/credit/safeMargins"
import { resolveBackgroundStyle } from "@/lib/credit/background"
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
  return items.filter((i) => i.type !== "spacer" && i.type !== "divider" && i.type !== "overlay")
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
  const fontWeight = config.fontWeight
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
        padding: `0 ${config.paddingX}px`,
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
      }}
    >
      {item.rich ? (
        <RichText rich={item.rich} baseWeight={fontWeight} />
      ) : (
        item.text || " "
      )}
    </div>
  )
}

// Line-by-line reveal: renders each text line, revealing them as `revealedLines` grows.
// Lines accumulate top-to-bottom; each one enters with the item's animation `variants`
// (fade/blur/slide/zoom), so the reveal combines with the chosen animation type.
function LinesItem({
  item,
  config,
  variants,
  live,
  isPlaying,
  totalLines,
  revealInterval,
  animType,
  animDuration,
  tunables,
  manualTimeIntoItem,
}: {
  item: CreditItem
  config: CreditConfig
  variants: ReturnType<typeof getVariants>
  live: boolean
  isPlaying: boolean
  totalLines: number
  revealInterval: number
  animType: AnimationType
  animDuration: number
  tunables: AnimationTunables
  // Manual/export mode: seconds into the item, so each line's entrance can be
  // frozen deterministically at its own point of the stagger.
  manualTimeIntoItem: number
}) {
  // Live reveal: this component mounts only when the item is visible (mode="wait"),
  // so the interval starts at the right moment. Pause freezes, resume continues.
  const [revealed, setRevealed] = React.useState(1)
  React.useEffect(() => {
    if (!live || !isPlaying || totalLines <= 1) return
    const id = setInterval(() => {
      setRevealed((n) => {
        if (n + 1 >= totalLines) clearInterval(id)
        return Math.min(totalLines, n + 1)
      })
    }, revealInterval * 1000)
    return () => clearInterval(id)
  }, [live, isPlaying, totalLines, revealInterval])

  const align = resolveAlignment(item, config)
  const ts = resolveTextStyle(item, config)
  const fontWeight = config.fontWeight
  const shadow = resolveTextShadow(item, config)
  const blur = resolveTextBlur(item, config)
  const richLines = item.rich ?? plainToRich(item.text || " ")
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
        padding: `0 ${config.paddingX}px`,
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
      }}
    >
      {richLines.map((line, i) => {
        // Manual/export: freeze each line's entrance at its point of the stagger,
        // derived from progress instead of the wall clock (frame-accurate).
        if (!live) {
          return (
            <div
              key={i}
              style={manualAppearStyle(animType, manualTimeIntoItem - i * revealInterval, animDuration, tunables)}
            >
              <LineSpans line={line} baseWeight={fontWeight} />
            </div>
          )
        }
        // Live: animate each line with the chosen variants as the interval reveals it.
        const shown = i < revealed
        return (
        <motion.div
          key={i}
          initial={variants.initial}
          animate={shown ? variants.animate : variants.initial}
          transition={variants.transition}
        >
          <LineSpans line={line} baseWeight={fontWeight} />
        </motion.div>
        )
      })}
    </div>
  )
}

// Typewriter render extracted from AppearingCredits: owns its live typing state.
// Mounts only when the item is visible (mode="wait"), so typing starts at the
// right moment. In manual/export mode it paints the parent-derived text statically.
function TypewriterItem({
  item,
  config,
  live,
  isPlaying,
  speed,
  manualTypedChars,
}: {
  item: CreditItem
  config: CreditConfig
  live: boolean
  isPlaying: boolean
  speed: number
  manualTypedChars: number
}) {
  const ts = resolveTextStyle(item, config)
  const rich = item.rich ?? plainToRich(item.text || "")
  const text = item.text || ""
  const [nTyped, setNTyped] = React.useState(0)
  React.useEffect(() => {
    if (!live || !isPlaying) return
    const id = setInterval(() => {
      setNTyped((n) => {
        if (n + 1 >= text.length) clearInterval(id)
        return Math.min(text.length, n + 1)
      })
    }, speed)
    return () => clearInterval(id)
  }, [live, isPlaying, text, speed])

  const shownRich = sliceRuns(rich, live ? nTyped : manualTypedChars)
  return (
    <div
      style={{
        fontFamily: ts.fontFamily,
        fontSize: `${ts.fontSize}px`,
        fontWeight: config.fontWeight,
        color: ts.color,
        letterSpacing: `${ts.letterSpacing}px`,
        lineHeight: ts.lineHeight,
        textAlign: resolveAlignment(item, config),
        textTransform: item.uppercase ? "uppercase" : undefined,
        padding: `0 ${config.paddingX}px`,
        maxWidth: ts.maxWidth,
        whiteSpace: ts.whiteSpace,
        wordBreak: ts.wordBreak,
        minHeight: "1.5em",
        filter: resolveTextBlur(item, config) > 0 ? `blur(${resolveTextBlur(item, config)}px)` : undefined,
      }}
    >
      <RichText rich={shownRich} baseWeight={config.fontWeight} />
      {live ? (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ display: "inline-block", marginLeft: "0.05em" }}
        >
          |
        </motion.span>
      ) : (
        // Manual/export: a wall-clock blinking cursor is non-deterministic per
        // captured frame; keep it steadily visible instead.
        <span style={{ display: "inline-block", marginLeft: "0.05em" }}>|</span>
      )}
    </div>
  )
}

// Fires once when mounted. Because AnimatePresence mode="wait" only mounts the
// new item after the previous one finishes exiting, this is the "item is now
// visible" signal — valid for the first item too.
function MountSignal({ onMount }: { onMount: () => void }) {
  const ref = React.useRef(onMount)
  React.useEffect(() => { ref.current = onMount }, [onMount]) // keep the latest callback (runs before the mount effect below)
  React.useEffect(() => { ref.current() }, []) // fire exactly once per mount (per appearance)
  return null
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
  const [cycle, setCycle] = React.useState(0)        // bumps each loop so single-item loops re-mount
  const [shownTick, setShownTick] = React.useState(0) // bumps when the current item becomes visible
  const currentIndexRef = React.useRef(0)
  React.useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  const handleShown = React.useCallback(() => setShownTick((t) => t + 1), [])
  // Manual-mode (export/scrub) derived state. Live playback is owned by the child items.
  const [manualTypedChars, setManualTypedChars] = React.useState(0)
  const [manualTimeIntoItem, setManualTimeIntoItem] = React.useState(0)

  // Compute per-item durations and total duration
  const itemDurations = React.useMemo(() => {
    return visibleItems.map((item) => getAppearItemDuration(item, config))
  }, [visibleItems, config])

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deriva estado del scrub/export externo; patrón verificado
    if (foundIdx !== currentIndex) setCurrentIndex(foundIdx)
    setManualTimeIntoItem(timeIntoItem)
    const foundItem = visibleItems[foundIdx]
    const foundType = foundItem ? resolveAnimationType(foundItem, config) : null
    if (foundItem && foundType === "typewriter") {
      const text = foundItem.text || ""
      setManualTypedChars(typedCharsAt(timeIntoItem, text.length, resolveTypewriterSpeed(foundItem, config)))
    } else {
      setManualTypedChars(0)
    }
  }, [manualProgress, visibleItems, itemDurations, totalDuration, config, currentIndex])

  // Reset on restart
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional al reiniciar la preview; patrón verificado
    setCurrentIndex(0)
    setCycle((c) => c + 1) // force a fresh appearance of item 0
    setManualTypedChars(0)
    setManualTimeIntoItem(0)
  }, [restartKey])

  // Advance is anchored to visibility: scheduled when the current item is shown
  // (shownTick) and rescheduled on resume. Reading currentIndex via ref avoids a
  // stale closure without re-scheduling on the (not-yet-visible) index change.
  React.useEffect(() => {
    if (manualProgress !== null) return
    if (!isPlaying || visibleItems.length === 0) return
    const idx = currentIndexRef.current
    if (idx >= visibleItems.length) return
    const item = visibleItems[idx]
    const t = setTimeout(() => {
      if (idx >= visibleItems.length - 1) {
        if (config.loop) {
          setCycle((c) => c + 1)
          setCurrentIndex(0)
        } else {
          setCurrentIndex(visibleItems.length) // -> Fin
        }
      } else {
        setCurrentIndex(idx + 1)
      }
    }, getAppearItemDuration(item, config) * 1000)
    return () => clearTimeout(t)
  }, [shownTick, isPlaying, manualProgress, visibleItems, config])

  // Background
  const backgroundStyle = resolveBackgroundStyle(config)

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

  const manual = manualProgress !== null
  const currentItem = visibleItems[Math.min(currentIndex, visibleItems.length - 1)]
  const currentAnimType = resolveAnimationType(currentItem, config)
  const animDuration = resolveAnimationDuration(currentItem, config)
  const tunables = resolveAnimationTunables(currentItem, config)
  const variants = getVariants(currentAnimType, animDuration, tunables)
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

      {(() => {
        const content =
          currentItem.type === "image" ? (
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
              variants={variants}
              live={!manual}
              isPlaying={isPlaying}
              totalLines={countItemLines(currentItem)}
              revealInterval={resolveLineRevealInterval(currentItem, config)}
              animType={currentAnimType}
              animDuration={animDuration}
              tunables={tunables}
              manualTimeIntoItem={manualTimeIntoItem}
            />
          ) : currentAnimType === "typewriter" ? (
            <TypewriterItem
              item={currentItem}
              config={config}
              live={!manual}
              isPlaying={isPlaying}
              speed={resolveTypewriterSpeed(currentItem, config)}
              manualTypedChars={manualTypedChars}
            />
          ) : (
            <AppearItem item={currentItem} config={config} />
          )

        // Manual/export: no AnimatePresence or wall-clock transitions. The entrance
        // is frozen at manualTimeIntoItem so every captured frame is deterministic
        // (staggered items animate per line inside LinesItem instead).
        if (manual) {
          return (
            <div
              className="w-full flex flex-col items-center justify-center px-4"
              style={staggered ? undefined : manualAppearStyle(currentAnimType, manualTimeIntoItem, animDuration, tunables)}
            >
              {content}
            </div>
          )
        }

        return (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentItem.id}-${currentIndex}-${cycle}-${restartKey}`}
              initial={containerVariants.initial}
              animate={containerVariants.animate}
              exit={containerVariants.exit}
              transition={containerVariants.transition}
              className="w-full flex flex-col items-center justify-center px-4"
            >
              <MountSignal onMount={handleShown} />
              {content}
            </motion.div>
          </AnimatePresence>
        )
      })()}
    </div>
  )
}
