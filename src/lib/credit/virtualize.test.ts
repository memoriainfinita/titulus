import { describe, it, expect } from "vitest"
import { visibleRange, leadingSpacerHeight } from "./virtualize"

// Four 100px boxes stacked from top 0, container 200px.
const boxes = [
  { top: 0, height: 100 },
  { top: 100, height: 100 },
  { top: 200, height: 100 },
  { top: 300, height: 100 },
]

describe("visibleRange", () => {
  it("returns the boxes intersecting the stage", () => {
    // translateY -150: screen tops -150, -50, 50, 150
    expect(visibleRange(boxes, -150, 200, 0)).toEqual({ first: 1, last: 3 })
  })

  it("widens the window by the buffer on both sides", () => {
    // translateY 250: screen tops 250.. -> none on stage, first one within 100px below
    expect(visibleRange(boxes, 250, 200, 0)).toBeNull()
    expect(visibleRange(boxes, 250, 200, 100)).toEqual({ first: 0, last: 0 })
  })

  it("excludes boxes fully above the stage", () => {
    // translateY -310: screen bottoms -210, -110, -10, 90
    expect(visibleRange(boxes, -310, 200, 0)).toEqual({ first: 3, last: 3 })
  })

  it("keeps zero-height markers that sit inside the window", () => {
    const withMarker = [...boxes.slice(0, 2), { top: 200, height: 0 }, ...boxes.slice(2)]
    expect(visibleRange(withMarker, -150, 200, 0)).toEqual({ first: 1, last: 4 })
  })

  it("returns null for no boxes", () => {
    expect(visibleRange([], 0, 200, 100)).toBeNull()
  })
})

describe("leadingSpacerHeight", () => {
  it("places the first rendered box at its measured top despite its own margin", () => {
    expect(leadingSpacerHeight(340, 24)).toBe(316)
  })

  it("never goes negative", () => {
    expect(leadingSpacerHeight(10, 24)).toBe(0)
  })
})
