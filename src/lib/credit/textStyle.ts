// Pure resolution of per-item text overrides over the global config.
// Each field: a valid per-item value wins, otherwise the global.
// Mirrors the resolve* pattern in separators.ts.

import { CreditItem, CreditConfig } from "./types"

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
  // Font, size and color come from config only: per-run overrides live in `rich`.
  const fontFamily = config.fontFamily
  const color = config.textColor
  const fontSize = config.fontSize
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
