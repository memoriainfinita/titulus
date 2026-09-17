import { describe, it, expect } from "vitest"
import { aspectRatioLabel, clampStageDimension, MAX_STAGE_DIMENSION, MIN_STAGE_DIMENSION } from "./stage"

describe("clampStageDimension", () => {
  it("keeps an even value inside the limits", () => {
    expect(clampStageDimension(1080, 720)).toBe(1080)
  })
  it("rounds to an even value", () => {
    expect(clampStageDimension(1079, 720)).toBe(1080)
  })
  it("clamps to the minimum", () => {
    expect(clampStageDimension(50, 720)).toBe(MIN_STAGE_DIMENSION)
  })
  it("clamps to the maximum", () => {
    expect(clampStageDimension(5000, 720)).toBe(MAX_STAGE_DIMENSION)
  })
  it("falls back when the value is not a number", () => {
    expect(clampStageDimension(NaN, 720)).toBe(720)
    expect(clampStageDimension(Infinity, 720)).toBe(720)
  })
})

describe("aspectRatioLabel", () => {
  it("reduces simple ratios", () => {
    expect(aspectRatioLabel(1280, 720)).toBe("16:9")
    expect(aspectRatioLabel(1080, 1920)).toBe("9:16")
    expect(aspectRatioLabel(1000, 1000)).toBe("1:1")
    expect(aspectRatioLabel(1200, 800)).toBe("3:2")
  })
  it("uses a decimal for ratios that do not reduce to small numbers", () => {
    expect(aspectRatioLabel(2048, 858)).toBe("2.39:1")
    expect(aspectRatioLabel(1280, 549)).toBe("2.33:1")
  })
  it("puts the decimal on the long side for portrait stages", () => {
    expect(aspectRatioLabel(858, 2048)).toBe("1:2.39")
  })
})
