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

// Progress (0..1) that places the item's center on the reference line.
// refFraction is the fraction of containerHeight for the line (0.5 = center).
export function scrollProgressForItem(
  itemTop: number,
  itemHeight: number,
  contentHeight: number,
  containerHeight: number,
  direction: ScrollDirection,
  refFraction: number,
): number {
  const total = getScrollTotalDistance(contentHeight, containerHeight)
  if (total <= 0) return 0
  const ref = refFraction * containerHeight
  const center = itemTop + itemHeight / 2
  // up:   translateY = containerHeight - p*total ; screenCenter = translateY + center = ref
  // down: translateY = -contentHeight + p*total  ; screenCenter = translateY + center = ref
  const p =
    direction === "up"
      ? (containerHeight + center - ref) / total
      : (ref + contentHeight - center) / total
  return Math.min(1, Math.max(0, p))
}

// Index of the item currently at/above the reference line: the last item whose
// on-screen top edge has passed the line. Monotonic in progress (no flicker).
// Returns -1 for empty input; clamps to the first item before anything crosses.
export function activeItemIndexAtProgress(
  offsets: { top: number; height: number }[],
  contentHeight: number,
  containerHeight: number,
  direction: ScrollDirection,
  progress: number,
  refFraction: number,
): number {
  if (offsets.length === 0) return -1
  const translateY = getScrollTranslateY(contentHeight, containerHeight, direction, progress)
  const ref = refFraction * containerHeight
  let active = 0
  for (let i = 0; i < offsets.length; i++) {
    const screenTop = translateY + offsets[i].top
    if (screenTop <= ref) active = i
    else break
  }
  return active
}
