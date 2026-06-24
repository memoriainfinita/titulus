import { describe, it, expect } from "vitest"
import { resolveSafeInset, TITLE_SAFE_INSET } from "./safeMargins"
import { DEFAULT_CONFIG } from "./types"

describe("resolveSafeInset", () => {
  it("returns 0 when respectSafeMargins is off", () => {
    expect(resolveSafeInset({ ...DEFAULT_CONFIG, respectSafeMargins: false })).toBe(0)
  })
  it("returns the title-safe inset when on", () => {
    expect(resolveSafeInset({ ...DEFAULT_CONFIG, respectSafeMargins: true })).toBe(TITLE_SAFE_INSET)
  })
})
