import { describe, it, expect } from "vitest"
import { getAppearItemDuration } from "./appearing"
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
