import { describe, it, expect } from "vitest"
import { resolveTextBlur } from "./text-blur"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function item(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "i", type: "name", text: "x", ...patch }
}

describe("resolveTextBlur", () => {
  it("uses the global blur when no override", () => {
    expect(resolveTextBlur(item(), cfg({ textBlur: 4 }))).toBe(4)
  })
  it("uses the item override when set", () => {
    expect(resolveTextBlur(item({ textBlur: 10 }), cfg({ textBlur: 4 }))).toBe(10)
  })
  it("allows an override of 0 to disable inherited blur", () => {
    expect(resolveTextBlur(item({ textBlur: 0 }), cfg({ textBlur: 4 }))).toBe(0)
  })
  it("ignores a negative override and falls back to global", () => {
    expect(resolveTextBlur(item({ textBlur: -3 }), cfg({ textBlur: 4 }))).toBe(4)
  })
})
