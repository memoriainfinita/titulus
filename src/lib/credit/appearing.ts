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

// Total time an item stays on screen before advancing to the next one, in seconds.
// Animation type and duration can be overridden per item.
// Typewriter derives its "animation" time from the text length and the
// (per-item-resolvable) typewriter speed instead.
export function getAppearItemDuration(item: CreditItem, config: CreditConfig): number {
  const pause = resolveItemPause(item, config)
  if (resolveAnimationType(item, config) === "typewriter") {
    const text = item.text || ""
    return Math.max(2, text.length * (resolveTypewriterSpeed(item, config) / 1000)) + pause
  }
  return resolveAnimationDuration(item, config) + pause
}
