import { describe, it, expect } from "vitest"
import { resolveImageWidth } from "./image"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function image(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "i", type: "image", text: "", ...patch }
}

describe("resolveImageWidth", () => {
  it("uses the global width when no override", () => {
    expect(resolveImageWidth(image(), cfg({ imageWidth: 40 }))).toBe(40)
  })
  it("uses the item override when set", () => {
    expect(resolveImageWidth(image({ imageWidth: 75 }), cfg())).toBe(75)
  })
  it("allows an override of 0", () => {
    expect(resolveImageWidth(image({ imageWidth: 0 }), cfg({ imageWidth: 40 }))).toBe(0)
  })
  it("ignores a negative override and falls back to global", () => {
    expect(resolveImageWidth(image({ imageWidth: -5 }), cfg({ imageWidth: 40 }))).toBe(40)
  })
})
