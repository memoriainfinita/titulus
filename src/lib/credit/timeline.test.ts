import { describe, it, expect } from "vitest"
import { itemProgressBounds } from "./timeline"

describe("itemProgressBounds", () => {
  it("returns empty for empty input", () => {
    expect(itemProgressBounds([])).toEqual([])
  })
  it("returns empty when total is zero", () => {
    expect(itemProgressBounds([0, 0])).toEqual([])
  })
  it("computes normalized cumulative bounds", () => {
    const b = itemProgressBounds([1, 3])
    expect(b[0]).toEqual({ start: 0, end: 0.25 })
    expect(b[1]).toEqual({ start: 0.25, end: 1 })
  })
  it("ends the last item at 1", () => {
    const b = itemProgressBounds([2, 2, 4])
    expect(b[b.length - 1].end).toBeCloseTo(1)
  })
})
