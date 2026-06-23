// Pure geometry helpers for scroll-mode credits.
// Extracted from ScrollCredits so the math can be tested in isolation.

export type ScrollDirection = "up" | "down"

// Total distance the content travels: it starts fully below the stage and ends
// fully above it, so it covers its own height plus one container height.
export function getScrollTotalDistance(
  contentHeight: number,
  containerHeight: number,
): number {
  return contentHeight + containerHeight
}

// Seconds the scroll takes to traverse the whole distance at the given speed
// (px per second). Returns 0 when there is nothing to scroll or speed is invalid.
export function getScrollDurationSec(
  contentHeight: number,
  containerHeight: number,
  scrollSpeed: number,
): number {
  const totalDistance = getScrollTotalDistance(contentHeight, containerHeight)
  return totalDistance > 0 && scrollSpeed > 0 ? totalDistance / scrollSpeed : 0
}

// One step of the scroll-progress state machine. Pure so the loop/pause logic
// can be tested without a render loop. The component owns the actual timer:
// on "pause" it schedules a single restart after the end pause and meanwhile
// holds at the end; "stop" stays at the end; "wrap" jumps back to the start.
export type ScrollStep =
  | { kind: "run"; progress: number }
  | { kind: "stop" }
  | { kind: "pause" }
  | { kind: "wrap" }

export function stepScrollProgress(
  prev: number,
  deltaSec: number,
  durationSec: number,
  loop: boolean,
  endPauseSec: number,
): ScrollStep {
  if (durationSec <= 0) return { kind: "run", progress: prev }
  const next = prev + deltaSec / durationSec
  if (next < 1) return { kind: "run", progress: next }
  if (!loop) return { kind: "stop" }
  if (endPauseSec > 0) return { kind: "pause" }
  return { kind: "wrap" }
}

// Vertical offset of the content for a given progress (0..1).
// At progress 0 the content sits just below the stage; at progress 1 it has
// scrolled completely past the top.
export function getScrollTranslateY(
  contentHeight: number,
  containerHeight: number,
  direction: ScrollDirection,
  progress: number,
): number {
  const totalDistance = getScrollTotalDistance(contentHeight, containerHeight)
  return direction === "up"
    ? containerHeight - progress * totalDistance
    : -contentHeight + progress * totalDistance
}
