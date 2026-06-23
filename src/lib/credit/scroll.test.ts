import { describe, it, expect } from "vitest"
import {
  getScrollTotalDistance,
  getScrollDurationSec,
  getScrollTranslateY,
} from "./scroll"

describe("getScrollTotalDistance", () => {
  it("sums content and container height", () => {
    expect(getScrollTotalDistance(1000, 720)).toBe(1720)
  })

  it("is zero when both are zero", () => {
    expect(getScrollTotalDistance(0, 0)).toBe(0)
  })
})

describe("getScrollDurationSec", () => {
  it("divides total distance by speed", () => {
    // (1000 + 720) / 60
    expect(getScrollDurationSec(1000, 720, 60)).toBeCloseTo(1720 / 60)
  })

  it("returns 0 when there is nothing to scroll", () => {
    expect(getScrollDurationSec(0, 0, 60)).toBe(0)
  })

  it("returns 0 for non-positive speed instead of dividing by zero", () => {
    expect(getScrollDurationSec(1000, 720, 0)).toBe(0)
  })
})

describe("getScrollTranslateY", () => {
  const content = 1000
  const container = 720
  const total = content + container

  it("up: starts just below the stage at progress 0", () => {
    expect(getScrollTranslateY(content, container, "up", 0)).toBe(container)
  })

  it("up: ends fully above the stage at progress 1", () => {
    expect(getScrollTranslateY(content, container, "up", 1)).toBe(container - total)
    expect(getScrollTranslateY(content, container, "up", 1)).toBe(-content)
  })

  it("down: starts fully above the stage at progress 0", () => {
    expect(getScrollTranslateY(content, container, "down", 0)).toBe(-content)
  })

  it("down: ends just below the stage at progress 1", () => {
    expect(getScrollTranslateY(content, container, "down", 1)).toBe(container)
  })

  it("up: is monotonically decreasing as progress grows", () => {
    const a = getScrollTranslateY(content, container, "up", 0.25)
    const b = getScrollTranslateY(content, container, "up", 0.75)
    expect(b).toBeLessThan(a)
  })
})
