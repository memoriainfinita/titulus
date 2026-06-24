// Pure resolution of per-item text overrides over the global config.
// Each field: a valid per-item value wins, otherwise the global.
// Mirrors the resolve* pattern in separators.ts.

import { CreditItem, CreditConfig } from "./types"
import { getFontSize } from "./store"

export interface ResolvedTextStyle {
  fontFamily: string
  fontSize: number
  color: string
  letterSpacing: number
  lineHeight: number
  whiteSpace: "pre" | "pre-wrap"
  wordBreak: "break-word" | "normal"
  maxWidth: string
}

export function resolveTextStyle(item: CreditItem, config: CreditConfig): ResolvedTextStyle {
  const fontFamily = item.fontFamily?.trim() ? item.fontFamily.trim() : config.fontFamily
  const color = item.color?.trim() ? item.color.trim() : config.textColor
  const fontSize =
    typeof item.fontSize === "number" && item.fontSize > 0
      ? item.fontSize
      : getFontSize(item.type, config)
  const letterSpacing =
    typeof item.letterSpacing === "number" ? item.letterSpacing : config.letterSpacing
  const lineHeight =
    typeof item.lineHeight === "number" && item.lineHeight > 0 ? item.lineHeight : config.lineHeight
  const noWrap = item.noWrap ?? config.noWrap
  const whiteSpace = noWrap ? "pre" : "pre-wrap"
  const wordBreak = noWrap ? "normal" : "break-word"
  const boxWidth =
    typeof item.textBoxWidth === "number" && item.textBoxWidth > 0
      ? item.textBoxWidth
      : config.textBoxWidth
  const maxWidth = `${boxWidth}%`
  return { fontFamily, fontSize, color, letterSpacing, lineHeight, whiteSpace, wordBreak, maxWidth }
}
