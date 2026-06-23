// Pure builder for the text-shadow CSS string, with configurable opacity.
// Shared by ScrollCredits and AppearingCredits so the shadow is composed identically.

import { CreditConfig } from "./types"

// Parse a #rgb or #rrggbb hex string into [r, g, b]. Returns null if unparseable.
function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Compose the shadow color, applying opacity when below full.
function shadowColor(color: string, opacity: number): string {
  if (opacity >= 1) return color
  const rgb = parseHex(color)
  if (!rgb) return color // non-hex color (e.g. named): leave as-is
  const a = Math.max(0, Math.min(1, opacity))
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`
}

export function resolveTextShadow(config: CreditConfig): string | undefined {
  if (!config.useTextShadow) return undefined
  const color = shadowColor(config.textShadowColor, config.textShadowOpacity)
  return `${config.textShadowX}px ${config.textShadowY}px ${config.textShadowBlur}px ${color}`
}
