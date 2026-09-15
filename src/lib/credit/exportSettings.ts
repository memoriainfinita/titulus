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

// Part of the piece to export, as fractions (0-1) of the whole timeline.
export interface ExportRange { start: number; end: number }

// In/out points as marked on the timeline (null = not set). An unset in point
// starts at 0 and an unset out point ends at 1; an empty range means no range.
export function normalizeRange(inPoint: number | null, outPoint: number | null): ExportRange | null {
  if (inPoint === null && outPoint === null) return null
  const start = Math.min(1, Math.max(0, inPoint ?? 0))
  const end = Math.min(1, Math.max(0, outPoint ?? 1))
  return start < end ? { start, end } : null
}

// Frames to render: a window over the full export's frame grid, so a range
// yields exactly the frames the full export has between the in and out points.
export interface FrameWindow { first: number; count: number; total: number }

export function frameWindow(duration: number, fps: number, range: ExportRange | null): FrameWindow {
  const total = Math.max(1, Math.ceil(duration * fps))
  if (!range) return { first: 0, count: total, total }
  const last = total - 1
  const first = Math.min(last, Math.max(0, Math.ceil(range.start * last - 1e-9)))
  const end = Math.min(last, Math.max(first, Math.floor(range.end * last + 1e-9)))
  return { first, count: end - first + 1, total }
}

// Timeline progress (0-1) of the i-th rendered frame.
export function frameProgress(i: number, w: FrameWindow): number {
  return (w.first + i) / (w.total - 1 || 1)
}
