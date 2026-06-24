export interface ProgressBound {
  start: number
  end: number
}

// Map per-item durations to normalized [start,end] progress fractions (0-1).
// Empty input or non-positive total → empty array.
export function itemProgressBounds(itemDurations: number[]): ProgressBound[] {
  const total = itemDurations.reduce((s, d) => s + Math.max(0, d), 0)
  if (total <= 0) return []
  const bounds: ProgressBound[] = []
  let acc = 0
  for (const d of itemDurations) {
    const start = acc / total
    acc += Math.max(0, d)
    bounds.push({ start, end: acc / total })
  }
  return bounds
}
