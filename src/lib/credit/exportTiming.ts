// Pure helpers for the export modal's live timing UI.
// Kept framework-free so they can be unit tested in isolation.

/** Format a millisecond elapsed time as `m:ss` (e.g. 113000 -> "1:53"). */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

/**
 * Estimate the remaining export time, in seconds, by linear extrapolation of
 * elapsed time against overall progress (0-1).
 *
 * Returns null when there isn't enough signal yet to give a meaningful number
 * (too little progress) or when the inputs are degenerate. The caller decides
 * whether to render it (we only show it during the dominant capturing/encoding
 * phases, never while the ffmpeg engine is still downloading).
 */
export function estimateRemainingSeconds(
  elapsedMs: number,
  overallProgress: number,
): number | null {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(overallProgress)) return null
  if (elapsedMs <= 0) return null
  // Below this, the extrapolation is too noisy to be useful. The caller feeds a
  // phase-local, roughly linear progress (e.g. frames captured), so a low floor
  // is fine.
  if (overallProgress <= 0.02) return null
  if (overallProgress >= 1) return 0
  const elapsedSeconds = elapsedMs / 1000
  const remaining = elapsedSeconds * (1 - overallProgress) / overallProgress
  return Math.max(0, Math.round(remaining))
}
