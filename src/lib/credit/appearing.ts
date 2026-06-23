// Pure timing helpers for appearing-mode credits.
// Extracted from AppearingCredits so the per-item duration math can be tested
// in isolation and is defined in one place.

import { CreditItem, CreditConfig } from "./types"

// Hold time for an item: its own override when set to a valid (>= 0) value,
// otherwise the global pause from the config.
export function resolveItemPause(item: CreditItem, config: CreditConfig): number {
  const override = item.pauseOverride
  return typeof override === "number" && override >= 0 ? override : config.pauseDuration
}

// Total time an item stays on screen before advancing to the next one, in seconds.
// The animation portion is global; only the pause (hold) can be overridden per item.
// Typewriter derives its "animation" time from the text length instead.
export function getAppearItemDuration(item: CreditItem, config: CreditConfig): number {
  const pause = resolveItemPause(item, config)
  if (config.animationType === "typewriter") {
    const text = item.text || ""
    return Math.max(2, text.length * 0.05) + pause
  }
  return config.animationDuration + pause
}
