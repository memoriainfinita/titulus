import { evenDimension } from "./exportSettings"

// Limits per side for a custom stage (px). Hardware H.264 encoders often stop at 4096 (covers DCI 4K).
export const MIN_STAGE_DIMENSION = 160
export const MAX_STAGE_DIMENSION = 4096

// Largest term shown as a plain fraction; beyond it the ratio is shown as a decimal.
const MAX_FRACTION_TERM = 32

// Even value within the limits; `fallback` when the input is not a finite number.
export function clampStageDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return evenDimension(Math.min(MAX_STAGE_DIMENSION, Math.max(MIN_STAGE_DIMENSION, value)))
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// "16:9" for simple ratios, "2.39:1" / "1:2.39" otherwise.
export function aspectRatioLabel(width: number, height: number): string {
  const d = gcd(width, height)
  const w = width / d
  const h = height / d
  if (Math.max(w, h) <= MAX_FRACTION_TERM) return `${w}:${h}`
  return width >= height
    ? `${Number((width / height).toFixed(2))}:1`
    : `1:${Number((height / width).toFixed(2))}`
}
