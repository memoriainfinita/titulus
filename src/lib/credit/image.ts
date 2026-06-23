// Pure resolution helper for image (logo) items.
// Override per item when valid, otherwise the global config value.
// Mirrors resolveSpacerHeight in separators.ts.

import { CreditItem, CreditConfig } from "./types"

export function resolveImageWidth(item: CreditItem, config: CreditConfig): number {
  return typeof item.imageWidth === "number" && item.imageWidth >= 0
    ? item.imageWidth
    : config.imageWidth
}
