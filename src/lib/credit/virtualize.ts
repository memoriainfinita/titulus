// Export-only windowing for scroll mode. html-to-image serializes the whole
// stage every frame (computed styles of every node plus every embedded image),
// so offscreen items are swapped for one spacer that keeps the geometry.

export interface Box {
  top: number // offsetTop within the scroll content (border box)
  height: number
}

// Contiguous index range of boxes whose on-screen span intersects
// [-buffer, containerHeight + buffer]. Tops must be non-decreasing.
export function visibleRange(
  boxes: Box[],
  translateY: number,
  containerHeight: number,
  buffer: number,
): { first: number; last: number } | null {
  let first = -1
  let last = -1
  for (let i = 0; i < boxes.length; i++) {
    const top = translateY + boxes[i].top
    const bottom = top + boxes[i].height
    if (top < containerHeight + buffer && bottom >= -buffer) {
      if (first === -1) first = i
      last = i
    }
  }
  return first === -1 ? null : { first, last }
}

// Height of the spacer that replaces everything above the first rendered box.
// The box keeps its own top margin, so the spacer stops that margin short of
// the measured top (the spacer has no margin, so nothing collapses into it).
export function leadingSpacerHeight(firstTop: number, firstMarginTop: number): number {
  return Math.max(0, firstTop - firstMarginTop)
}
