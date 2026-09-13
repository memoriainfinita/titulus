import type { QualityLevel } from "mediabunny"

export type ExportQuality = "fast" | "balanced" | "high"

// H.264 / yuv420p needs even dimensions. Same rounding the dialog displays.
export function evenDimension(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2)
}

// WebCodecs has no CRF: the quality selector maps to Mediabunny bitrate levels.
export const WEBCODECS_QUALITY: Record<ExportQuality, QualityLevel> = {
  fast: "medium",
  balanced: "high",
  high: "very-high",
}

// Explicit per-frame timing in seconds (non-realtime encode).
export function frameTiming(index: number, fps: number): { timestamp: number; duration: number } {
  return { timestamp: index / fps, duration: 1 / fps }
}

// Rendering fills 0-0.95 of the bar; the rest is the mux flush.
export function renderingProgress(framesDone: number, totalFrames: number): number {
  if (totalFrames <= 0) return 0
  return Math.min(1, framesDone / totalFrames) * 0.95
}
