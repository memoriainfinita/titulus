import { CreditConfig } from "./types"

// Inset fraction (per edge) of the title-safe box.
export const TITLE_SAFE_INSET = 0.1

// Fraction of horizontal inset to apply to credit content. 0 when disabled.
export function resolveSafeInset(config: CreditConfig): number {
  return config.respectSafeMargins ? TITLE_SAFE_INSET : 0
}
