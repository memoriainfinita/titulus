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

// Number of typed characters at a given time into a typewriter item.
// Typing time has a 2s floor (matches getAppearItemDuration).
export function typedCharsAt(timeIntoItem: number, textLength: number, speedMs: number): number {
  if (textLength <= 0) return 0
  const typingDuration = Math.max(2, textLength * (speedMs / 1000))
  return Math.min(textLength, Math.floor((timeIntoItem / typingDuration) * textLength))
}

// Eased progress for entrance animations: cubic-bezier(0.4, 0, 0.2, 1), the same
// curve the live variants use, so export/scrub frames match live playback.
// Solved with Newton-Raphson on the bezier's x component.
export function easeAppear(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const x1 = 0.4
  const x2 = 0.2
  const sampleX = (u: number) => 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u ** 2 * x2 + u ** 3
  // y1 = 0 and y2 = 1 make the y polynomial collapse to this form.
  const sampleY = (u: number) => 3 * (1 - u) * u ** 2 + u ** 3
  let u = t
  for (let i = 0; i < 8; i++) {
    const x = sampleX(u) - t
    if (Math.abs(x) < 1e-5) break
    const dx = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u ** 2 * (1 - x2)
    if (dx === 0) break
    u = Math.min(1, Math.max(0, u - x / dx))
  }
  return sampleY(u)
}

// CSS style for an entrance frozen at a given time into the item, for the
// manual (export/scrub) render path: deterministic, no wall-clock animation.
// Mirrors the initial -> animate states of getVariants for each type.
// A type alias (not interface) so it gets an implicit index signature and is
// assignable to React.CSSProperties without importing React here.
export type ManualAppearStyle = {
  opacity?: number
  transform?: string
  filter?: string
}

export function manualAppearStyle(
  type: AnimationType,
  timeIntoItem: number,
  animDuration: number,
  { slide, blur, zoomFrom }: AnimationTunables,
): ManualAppearStyle {
  if (type === "typewriter") return {}
  const f = animDuration > 0 ? Math.min(1, Math.max(0, timeIntoItem / animDuration)) : 1
  const e = easeAppear(f)
  switch (type) {
    case "slide-up":
      return { opacity: e, transform: `translateY(${(1 - e) * slide}px)` }
    case "slide-down":
      return { opacity: e, transform: `translateY(${-(1 - e) * slide}px)` }
    case "slide-left":
      return { opacity: e, transform: `translateX(${(1 - e) * slide}px)` }
    case "slide-right":
      return { opacity: e, transform: `translateX(${-(1 - e) * slide}px)` }
    case "zoom":
      return { opacity: e, transform: `scale(${zoomFrom + (1 - zoomFrom) * e})` }
    case "blur":
      return { opacity: e, filter: `blur(${(1 - e) * blur}px)` }
    case "fade":
    default:
      // Unknown/legacy persisted types fall back to fade, like getVariants.
      return { opacity: e }
  }
}
