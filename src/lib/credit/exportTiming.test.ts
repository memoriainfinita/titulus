import { describe, it, expect } from "vitest"
import { formatElapsed, estimateRemainingSeconds } from "./exportTiming"

describe("formatElapsed", () => {
  it("formats zero as 0:00", () => {
    expect(formatElapsed(0)).toBe("0:00")
  })

  it("zero-pads seconds under ten", () => {
    expect(formatElapsed(5000)).toBe("0:05")
  })

  it("formats minutes and seconds", () => {
    expect(formatElapsed(113000)).toBe("1:53")
  })

  it("floors partial seconds", () => {
    expect(formatElapsed(42999)).toBe("0:42")
  })

  it("treats negative input as zero", () => {
    expect(formatElapsed(-1000)).toBe("0:00")
  })
})

describe("estimateRemainingSeconds", () => {
  it("returns null before there is enough progress", () => {
    expect(estimateRemainingSeconds(2000, 0.02)).toBeNull()
  })

  it("returns a number once a little past the floor", () => {
    expect(estimateRemainingSeconds(2000, 0.04)).toBeGreaterThan(0)
  })

  it("returns null with no elapsed time", () => {
    expect(estimateRemainingSeconds(0, 0.5)).toBeNull()
  })

  it("extrapolates linearly: at 50% the remaining equals the elapsed", () => {
    expect(estimateRemainingSeconds(40000, 0.5)).toBe(40)
  })

  it("shrinks as progress grows", () => {
    // 80% done after 40s -> ~10s left
    expect(estimateRemainingSeconds(40000, 0.8)).toBe(10)
  })

  it("returns 0 once complete", () => {
    expect(estimateRemainingSeconds(40000, 1)).toBe(0)
  })

  it("returns null for non-finite inputs", () => {
    expect(estimateRemainingSeconds(NaN, 0.5)).toBeNull()
    expect(estimateRemainingSeconds(40000, Infinity)).toBeNull()
  })
})
