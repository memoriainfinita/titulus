// Pure helpers for overlay items: a fixed image over the scroll, shown when its
// (zero-height) marker in the list reaches the stage center. Visibility is
// derived from scroll time, never from timers, so preview, scrub and export agree.

import { CreditItem, OverlayLayer } from "./types"
import { ScrollDirection, scrollProgressForItem } from "./scroll"

export const OVERLAY_DEFAULTS: { x: number; y: number; duration: number; fade: number; layer: OverlayLayer } = {
  x: 50, y: 50, duration: 4, fade: 0.5, layer: "front",
}

// Same reference line as the active-item highlight and double-click seek.
const TRIGGER_FRACTION = 0.5

export function resolveOverlay(item: CreditItem) {
  const clampPct = (v: number | undefined, d: number) =>
    typeof v === "number" && !Number.isNaN(v) ? Math.max(0, Math.min(100, v)) : d
  const duration =
    typeof item.overlayDuration === "number" && item.overlayDuration > 0
      ? item.overlayDuration
      : OVERLAY_DEFAULTS.duration
  const fade =
    typeof item.overlayFade === "number" && item.overlayFade >= 0
      ? item.overlayFade
      : OVERLAY_DEFAULTS.fade
  return {
    x: clampPct(item.overlayX, OVERLAY_DEFAULTS.x),
    y: clampPct(item.overlayY, OVERLAY_DEFAULTS.y),
    duration,
    fade: Math.min(fade, duration / 2),
    layer: item.overlayLayer === "back" ? "back" : OVERLAY_DEFAULTS.layer,
  }
}

// Scroll time (s) at which the marker reaches the trigger line.
export function overlayStartSec(
  markerTop: number,
  contentHeight: number,
  containerHeight: number,
  direction: ScrollDirection,
  scrollDurationSec: number,
): number {
  const p = scrollProgressForItem(markerTop, 0, contentHeight, containerHeight, direction, TRIGGER_FRACTION)
  return p * scrollDurationSec
}

// Opacity (0-1) at scroll time tSec: linear fade in, hold, linear fade out.
export function overlayOpacityAt(tSec: number, startSec: number, duration: number, fade: number): number {
  const local = tSec - startSec
  if (local < 0 || local > duration) return 0
  if (fade <= 0) return 1
  return Math.max(0, Math.min(1, local / fade, (duration - local) / fade))
}
