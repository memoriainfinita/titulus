// Pure timing helpers for appearing-mode credits.
// Extracted from AppearingCredits so the per-item duration math can be tested
// in isolation and is defined in one place.

import { CreditItem, CreditConfig, AnimationType } from "./types"

export interface AnimationTunables {
  slide: number // px traveled by slide-* variants
  blur: number // px blur for the blur variant
  zoomFrom: number // initial scale for zoom
  zoomTo: number // exit scale for zoom
}

// Hold time for an item: its own override when set to a valid (>= 0) value,
// otherwise the global pause from the config.
export function resolveItemPause(item: CreditItem, config: CreditConfig): number {
  const override = item.pauseOverride
  return typeof override === "number" && override >= 0 ? override : config.pauseDuration
}

// Animation type for an item: its own override, otherwise the global type.
export function resolveAnimationType(item: CreditItem, config: CreditConfig): AnimationType {
  return item.animationType ?? config.animationType
}

// Animation duration (seconds) for an item: its own override when > 0, otherwise global.
export function resolveAnimationDuration(item: CreditItem, config: CreditConfig): number {
  const o = item.animationDuration
  return typeof o === "number" && o > 0 ? o : config.animationDuration
}

// Per-item animation tunables, each falling back to the global config value.
// 0 and negatives are valid overrides (only `undefined` inherits).
export function resolveAnimationTunables(item: CreditItem, config: CreditConfig): AnimationTunables {
  const pick = (o: number | undefined, g: number) => (typeof o === "number" ? o : g)
  return {
    slide: pick(item.animSlideDistance, config.animSlideDistance),
    blur: pick(item.animBlurAmount, config.animBlurAmount),
    zoomFrom: pick(item.animZoomFrom, config.animZoomFrom),
    zoomTo: pick(item.animZoomTo, config.animZoomTo),
  }
}

// Typewriter speed (ms per character) for an item: its own override when > 0,
// otherwise the global speed.
export function resolveTypewriterSpeed(item: CreditItem, config: CreditConfig): number {
  const o = item.typewriterSpeed
  return typeof o === "number" && o > 0 ? o : config.typewriterSpeed
}

// Line-by-line reveal interval (seconds per line) for an item: its own override
// when > 0, otherwise the global interval.
export function resolveLineRevealInterval(item: CreditItem, config: CreditConfig): number {
  const o = item.lineRevealInterval
  return typeof o === "number" && o > 0 ? o : config.lineRevealInterval
}

// Whether the item reveals its text line by line. Tri-state per item override,
// otherwise the global flag.
export function resolveStaggerLines(item: CreditItem, config: CreditConfig): boolean {
  return item.staggerLines ?? config.staggerLines
}

// Number of text lines in an item (split on "\n"). Empty text counts as one line.
export function countItemLines(item: CreditItem): number {
  return (item.text || "").split("\n").length
}

// Whether line-by-line staggering is actually applied to this item: the flag is on,
// the animation is not typewriter, and there is more than one line.
export function isLineStaggered(item: CreditItem, config: CreditConfig): boolean {
  return (
    resolveStaggerLines(item, config) &&
    resolveAnimationType(item, config) !== "typewriter" &&
    countItemLines(item) > 1
  )
}

// Total time an item stays on screen before advancing to the next one, in seconds.
// Animation type and duration can be overridden per item.
// Typewriter derives its "animation" time from the text length and the
// (per-item-resolvable) typewriter speed instead.
// When line-by-line is enabled, the entrance is staggered: each extra line adds
// one interval on top of the per-line animation duration.
export function getAppearItemDuration(item: CreditItem, config: CreditConfig): number {
  const pause = resolveItemPause(item, config)
  const type = resolveAnimationType(item, config)
  if (type === "typewriter") {
    const text = item.text || ""
    return Math.max(2, text.length * (resolveTypewriterSpeed(item, config) / 1000)) + pause
  }
  const stagger = isLineStaggered(item, config)
    ? (countItemLines(item) - 1) * resolveLineRevealInterval(item, config)
    : 0
  return stagger + resolveAnimationDuration(item, config) + pause
}

// Number of lines visible at a given time into a line-by-line item.
// At t=0 the first line is already entering; each interval adds one more.
export function revealedLinesAt(timeIntoItem: number, intervalSec: number, totalLines: number): number {
  if (totalLines <= 1) return totalLines
  const shown = intervalSec > 0 ? Math.floor(timeIntoItem / intervalSec) + 1 : totalLines
  return Math.max(1, Math.min(totalLines, shown))
}

// Number of typed characters at a given time into a typewriter item.
// Typing time has a 2s floor (matches getAppearItemDuration).
export function typedCharsAt(timeIntoItem: number, textLength: number, speedMs: number): number {
  if (textLength <= 0) return 0
  const typingDuration = Math.max(2, textLength * (speedMs / 1000))
  return Math.min(textLength, Math.floor((timeIntoItem / typingDuration) * textLength))
}
