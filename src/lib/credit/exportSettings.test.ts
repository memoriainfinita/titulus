import { describe, it, expect } from "vitest"
import { evenDimension, WEBCODECS_QUALITY, frameTiming, renderingProgress } from "./exportSettings"

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
