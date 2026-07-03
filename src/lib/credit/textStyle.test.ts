import { describe, it, expect } from "vitest"
import { resolveTextStyle } from "./textStyle"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function item(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "t", type: "text", text: "X", ...patch }
}

describe("resolveTextStyle", () => {
  it("inherits all globals when no overrides", () => {
    const c = cfg({ fontFamily: "'Inter', sans-serif", textColor: "#fff", letterSpacing: 2, lineHeight: 1.4 })
    const r = resolveTextStyle(item(), c)
    expect(r.fontFamily).toBe("'Inter', sans-serif")
    expect(r.fontSize).toBe(c.fontSize)
    expect(r.color).toBe("#fff")
    expect(r.letterSpacing).toBe(2)
    expect(r.lineHeight).toBe(1.4)
  })
  it("uses the single global fontSize", () => {
    expect(resolveTextStyle(item(), cfg({ fontSize: 48 })).fontSize).toBe(48)
    expect(resolveTextStyle(item(), cfg()).fontSize).toBe(DEFAULT_CONFIG.fontSize)
  })
  it("applies per-item overrides over globals", () => {
    const r = resolveTextStyle(
      item({ letterSpacing: -1, lineHeight: 2 }),
      cfg(),
    )
    expect(r.letterSpacing).toBe(-1)
    expect(r.lineHeight).toBe(2)
  })
  it("ignores a non-positive lineHeight, falling back to global", () => {
    const c = cfg({ lineHeight: 1.5 })
    const r = resolveTextStyle(item({ lineHeight: 0 }), c)
    expect(r.lineHeight).toBe(1.5)
  })
  it("allows a letterSpacing override of 0", () => {
    expect(resolveTextStyle(item({ letterSpacing: 0 }), cfg({ letterSpacing: 5 })).letterSpacing).toBe(0)
  })
})

describe("resolveTextStyle wrap/box-width", () => {
  it("wraps by default", () => {
    const s = resolveTextStyle(item(), cfg())
    expect(s.whiteSpace).toBe("pre-wrap")
    expect(s.wordBreak).toBe("break-word")
    expect(s.maxWidth).toBe("100%")
  })
  it("global noWrap switches to pre/normal", () => {
    const s = resolveTextStyle(item(), cfg({ noWrap: true }))
    expect(s.whiteSpace).toBe("pre")
    expect(s.wordBreak).toBe("normal")
  })
  it("per-item noWrap overrides global", () => {
    const s = resolveTextStyle(item({ noWrap: false }), cfg({ noWrap: true }))
    expect(s.whiteSpace).toBe("pre-wrap")
  })
  it("per-item textBoxWidth overrides global; invalid falls back", () => {
    expect(resolveTextStyle(item({ textBoxWidth: 60 }), cfg()).maxWidth).toBe("60%")
    expect(resolveTextStyle(item({ textBoxWidth: 0 }), cfg({ textBoxWidth: 80 })).maxWidth).toBe("80%")
  })
})
