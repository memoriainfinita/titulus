import { describe, it, expect } from "vitest"
import { evenDimension, WEBCODECS_QUALITY, frameTiming, renderingProgress, normalizeRange, frameWindow, frameProgress } from "./exportSettings"

describe("evenDimension", () => {
  it("keeps even numbers unchanged", () => {
    expect(evenDimension(1920)).toBe(1920)
  })

  it("rounds odd and fractional values to even", () => {
    expect(evenDimension(1920 * 1.5)).toBe(2880)
    expect(evenDimension(1081)).toBe(1082)
    expect(evenDimension(1621.5)).toBe(1622)
  })

  it("never returns less than 2", () => {
    expect(evenDimension(0)).toBe(2)
  })
})

describe("WEBCODECS_QUALITY", () => {
  it("maps fast to medium", () => {
    expect(WEBCODECS_QUALITY.fast).toBe("medium")
  })

  it("maps balanced to high", () => {
    expect(WEBCODECS_QUALITY.balanced).toBe("high")
  })

  it("maps high to very-high", () => {
    expect(WEBCODECS_QUALITY.high).toBe("very-high")
  })
})

describe("frameTiming", () => {
  it("derives timestamp and duration from index and fps", () => {
    expect(frameTiming(0, 30)).toEqual({ timestamp: 0, duration: 1 / 30 })
    expect(frameTiming(30, 30)).toEqual({ timestamp: 1, duration: 1 / 30 })
  })
})

describe("renderingProgress", () => {
  it("scales frames done to the 0-0.95 range", () => {
    expect(renderingProgress(0, 100)).toBe(0)
    expect(renderingProgress(50, 100)).toBeCloseTo(0.475)
    expect(renderingProgress(100, 100)).toBeCloseTo(0.95)
  })

  it("returns 0 when there are no frames", () => {
    expect(renderingProgress(0, 0)).toBe(0)
  })
})

describe("normalizeRange", () => {
  it("returns null when no point is set", () => {
    expect(normalizeRange(null, null)).toBeNull()
  })

  it("fills a missing point with the start or the end", () => {
    expect(normalizeRange(0.3, null)).toEqual({ start: 0.3, end: 1 })
    expect(normalizeRange(null, 0.6)).toEqual({ start: 0, end: 0.6 })
  })

  it("clamps to 0-1", () => {
    expect(normalizeRange(-0.2, 1.4)).toEqual({ start: 0, end: 1 })
  })

  it("returns null when the in point is not before the out point", () => {
    expect(normalizeRange(0.5, 0.5)).toBeNull()
    expect(normalizeRange(0.7, 0.2)).toBeNull()
  })
})

describe("frameWindow", () => {
  it("without a range covers every frame, as before", () => {
    expect(frameWindow(38.05, 30, null)).toEqual({ first: 0, count: 1142, total: 1142 })
  })

  it("the full range equals no range", () => {
    expect(frameWindow(10, 30, { start: 0, end: 1 })).toEqual(frameWindow(10, 30, null))
  })

  it("maps a range onto the full export's frames", () => {
    // 101 frames: progress k/100 per frame
    expect(frameWindow(101 / 30, 30, { start: 0.25, end: 0.5 })).toEqual({ first: 25, count: 26, total: 101 })
  })

  it("a range shorter than a frame still yields one frame", () => {
    expect(frameWindow(101 / 30, 30, { start: 0.251, end: 0.252 }).count).toBe(1)
  })
})

describe("frameProgress", () => {
  it("without a range reproduces i / (total - 1)", () => {
    const w = frameWindow(101 / 30, 30, null)
    expect(frameProgress(0, w)).toBe(0)
    expect(frameProgress(50, w)).toBeCloseTo(0.5)
    expect(frameProgress(100, w)).toBe(1)
  })

  it("with a range starts at the first frame's progress", () => {
    const w = frameWindow(101 / 30, 30, { start: 0.25, end: 0.5 })
    expect(frameProgress(0, w)).toBeCloseTo(0.25)
    expect(frameProgress(w.count - 1, w)).toBeCloseTo(0.5)
  })

  it("returns 0 when there is a single frame", () => {
    expect(frameProgress(0, { first: 0, count: 1, total: 1 })).toBe(0)
  })
})
