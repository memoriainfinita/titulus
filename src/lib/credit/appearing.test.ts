import { describe, it, expect } from "vitest"
import {
  getAppearItemDuration,
  resolveAnimationType,
  resolveAnimationDuration,
  resolveAnimationTunables,
} from "./appearing"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function makeConfig(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}

function makeItem(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "x", type: "name", text: "Hola", ...patch }
}

describe("getAppearItemDuration (non-typewriter)", () => {
  const config = makeConfig({
    animationType: "fade",
    animationDuration: 1.5,
    pauseDuration: 2,
  })

  it("uses global pause when no override", () => {
    expect(getAppearItemDuration(makeItem(), config)).toBe(3.5)
  })

  it("uses the item pause override instead of the global pause", () => {
    expect(getAppearItemDuration(makeItem({ pauseOverride: 5 }), config)).toBe(6.5)
  })

  it("allows an override of 0 (animation only, no hold)", () => {
    expect(getAppearItemDuration(makeItem({ pauseOverride: 0 }), config)).toBe(1.5)
  })

  it("ignores a negative override and falls back to the global pause", () => {
    expect(getAppearItemDuration(makeItem({ pauseOverride: -3 }), config)).toBe(3.5)
  })
})

describe("getAppearItemDuration (typewriter)", () => {
  // typing time = max(2, text.length * 0.05)
  const config = makeConfig({
    animationType: "typewriter",
    animationDuration: 1.5,
    pauseDuration: 2,
  })

  it("uses computed typing time plus the global pause when no override", () => {
    // "Hola" -> 4 * 0.05 = 0.2 -> max(2, 0.2) = 2 ; + 2 = 4
    expect(getAppearItemDuration(makeItem({ text: "Hola" }), config)).toBe(4)
  })

  it("uses computed typing time plus the override pause", () => {
    expect(getAppearItemDuration(makeItem({ text: "Hola", pauseOverride: 1 }), config)).toBe(3)
  })

  it("scales typing time with long text", () => {
    const text = "x".repeat(100) // 100 * 0.05 = 5
    expect(getAppearItemDuration(makeItem({ text, pauseOverride: 0 }), config)).toBe(5)
  })
})

describe("per-item animation resolvers", () => {
  const config = makeConfig({
    animationType: "fade",
    animationDuration: 1.5,
    animSlideDistance: 80,
    animBlurAmount: 20,
    animZoomFrom: 0.6,
    animZoomTo: 1.4,
  })

  it("resolveAnimationType inherits the global type by default", () => {
    expect(resolveAnimationType(makeItem(), config)).toBe("fade")
  })

  it("resolveAnimationType uses the per-item override", () => {
    expect(resolveAnimationType(makeItem({ animationType: "zoom" }), config)).toBe("zoom")
  })

  it("resolveAnimationDuration inherits the global value, then overrides when > 0", () => {
    expect(resolveAnimationDuration(makeItem(), config)).toBe(1.5)
    expect(resolveAnimationDuration(makeItem({ animationDuration: 3 }), config)).toBe(3)
  })

  it("resolveAnimationDuration ignores a non-positive override", () => {
    expect(resolveAnimationDuration(makeItem({ animationDuration: 0 }), config)).toBe(1.5)
  })

  it("resolveAnimationTunables falls back per field but allows 0/negatives", () => {
    expect(resolveAnimationTunables(makeItem(), config)).toEqual({
      slide: 80,
      blur: 20,
      zoomFrom: 0.6,
      zoomTo: 1.4,
    })
    const overridden = resolveAnimationTunables(
      makeItem({ animSlideDistance: 0, animBlurAmount: 5 }),
      config,
    )
    expect(overridden.slide).toBe(0)
    expect(overridden.blur).toBe(5)
    expect(overridden.zoomFrom).toBe(0.6)
  })

  it("getAppearItemDuration honors a per-item animation type and duration", () => {
    // Item forces typewriter even though global is fade -> typing time, not duration
    const tw = getAppearItemDuration(makeItem({ text: "Hola", animationType: "typewriter", pauseOverride: 0 }), config)
    expect(tw).toBe(2)
    // Item overrides the duration of a fade
    const faded = getAppearItemDuration(makeItem({ animationDuration: 4, pauseOverride: 0 }), config)
    expect(faded).toBe(4)
  })
})
