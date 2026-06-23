import { describe, it, expect } from "vitest"
import { resolveTextShadow } from "./text-shadow"
import { DEFAULT_CONFIG, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}

describe("resolveTextShadow", () => {
  it("returns undefined when the shadow is disabled", () => {
    expect(resolveTextShadow(cfg({ useTextShadow: false }))).toBeUndefined()
  })

  it("uses the raw hex color when opacity is full", () => {
    const s = resolveTextShadow(
      cfg({ textShadowX: 0, textShadowY: 2, textShadowBlur: 12, textShadowColor: "#000000", textShadowOpacity: 1 }),
    )
    expect(s).toBe("0px 2px 12px #000000")
  })

  it("converts to rgba when opacity is below 1", () => {
    const s = resolveTextShadow(
      cfg({ textShadowX: 1, textShadowY: 2, textShadowBlur: 8, textShadowColor: "#ff8800", textShadowOpacity: 0.5 }),
    )
    expect(s).toBe("1px 2px 8px rgba(255, 136, 0, 0.5)")
  })

  it("expands 3-digit hex colors", () => {
    const s = resolveTextShadow(
      cfg({ textShadowX: 0, textShadowY: 0, textShadowBlur: 4, textShadowColor: "#f80", textShadowOpacity: 0.25 }),
    )
    expect(s).toBe("0px 0px 4px rgba(255, 136, 0, 0.25)")
  })

  it("clamps opacity into the 0-1 range", () => {
    const s = resolveTextShadow(
      cfg({ textShadowX: 0, textShadowY: 0, textShadowBlur: 0, textShadowColor: "#000000", textShadowOpacity: -1 }),
    )
    expect(s).toBe("0px 0px 0px rgba(0, 0, 0, 0)")
  })

  it("falls back to the raw color if it cannot be parsed", () => {
    const s = resolveTextShadow(
      cfg({ textShadowX: 0, textShadowY: 0, textShadowBlur: 2, textShadowColor: "red", textShadowOpacity: 0.5 }),
    )
    expect(s).toBe("0px 0px 2px red")
  })
})
