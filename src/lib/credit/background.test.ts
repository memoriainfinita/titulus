import { describe, it, expect } from "vitest"
import { resolveBackgroundStyle, fitWithin } from "./background"
import { DEFAULT_CONFIG, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}

const IMG = "data:image/jpeg;base64,AAAA"

describe("resolveBackgroundStyle", () => {
  it("defaults to no background image", () => {
    expect(DEFAULT_CONFIG.backgroundImage).toBe("")
    expect(DEFAULT_CONFIG.backgroundImageFit).toBe("cover")
    expect(DEFAULT_CONFIG.backgroundImageDim).toBe(0)
  })

  it("uses the solid color alone without image or gradient", () => {
    expect(resolveBackgroundStyle(cfg({ backgroundColor: "#112233" }))).toEqual({
      backgroundColor: "#112233",
    })
  })

  it("uses the gradient without image", () => {
    const s = resolveBackgroundStyle(
      cfg({ useGradient: true, gradientAngle: 90, gradientFrom: "#000000", gradientTo: "#ffffff" }),
    )
    expect(s.backgroundImage).toBe("linear-gradient(90deg, #000000, #ffffff)")
  })

  it("layers the image over the solid color with the chosen fit", () => {
    const s = resolveBackgroundStyle(
      cfg({ backgroundColor: "#112233", backgroundImage: IMG, backgroundImageFit: "contain" }),
    )
    expect(s.backgroundColor).toBe("#112233")
    expect(s.backgroundImage).toBe(`url("${IMG}")`)
    expect(s.backgroundSize).toBe("contain")
    expect(s.backgroundPosition).toBe("center")
    expect(s.backgroundRepeat).toBe("no-repeat")
  })

  it("keeps the gradient beneath the image", () => {
    const s = resolveBackgroundStyle(
      cfg({ useGradient: true, gradientAngle: 180, gradientFrom: "#000000", gradientTo: "#1a1a2e", backgroundImage: IMG }),
    )
    expect(s.backgroundImage).toBe(`url("${IMG}"), linear-gradient(180deg, #000000, #1a1a2e)`)
    expect(s.backgroundSize).toBe("cover, 100% 100%")
    expect(s.backgroundPosition).toBe("center, center")
    expect(s.backgroundRepeat).toBe("no-repeat, no-repeat")
  })

  it("adds a dim layer on top of the image", () => {
    const s = resolveBackgroundStyle(cfg({ backgroundImage: IMG, backgroundImageDim: 0.4 }))
    expect(s.backgroundImage).toBe(
      `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url("${IMG}")`,
    )
    expect(s.backgroundSize).toBe("100% 100%, cover")
  })

  it("ignores the dim without an image and clamps it", () => {
    expect(resolveBackgroundStyle(cfg({ backgroundImageDim: 0.5 }))).toEqual({ backgroundColor: "#000000" })
    const s = resolveBackgroundStyle(cfg({ backgroundImage: IMG, backgroundImageDim: 2 }))
    expect(s.backgroundImage).toContain("rgba(0, 0, 0, 1)")
  })
})

describe("fitWithin", () => {
  it("keeps images already within the limit", () => {
    expect(fitWithin(1280, 720, 1920)).toEqual({ width: 1280, height: 720 })
  })

  it("scales the long side down to the limit keeping the ratio", () => {
    expect(fitWithin(4000, 3000, 1920)).toEqual({ width: 1920, height: 1440 })
    expect(fitWithin(3000, 6000, 1920)).toEqual({ width: 960, height: 1920 })
  })

  it("rounds to whole pixels, at least 1", () => {
    expect(fitWithin(3333, 1, 1920)).toEqual({ width: 1920, height: 1 })
  })
})
