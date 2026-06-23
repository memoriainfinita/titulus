// Pure resolution for per-text blur (CSS filter: blur). Mirrors the separators.ts pattern:
// item override when set to a valid value (>= 0), otherwise the global config value.

import { CreditItem, CreditConfig } from "./types"

export function resolveTextBlur(item: CreditItem, config: CreditConfig): number {
  const override = item.textBlur
  return typeof override === "number" && override >= 0 ? override : config.textBlur
}
