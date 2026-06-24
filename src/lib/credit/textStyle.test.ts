import { describe, it, expect } from "vitest"
import { resolveTextStyle } from "./textStyle"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function item(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "t", type: "name", text: "X", ...patch }
}

describe("resolveTextStyle", () => {
  it("inherits all globals when no overrides", () => {
    const c = cfg({ fontFamily: "'Inter', sans-serif", textColor: "#fff", letterSpacing: 2, lineHeight: 1.4 })
    const r = resolveTextStyle(item({ type: "name" }), c)
    expect(r.fontFamily).toBe("'Inter', sans-serif")
    expect(r.fontSize).toBe(c.fontSizeName)
    expect(r.color).toBe("#fff")
    expect(r.letterSpacing).toBe(2)
    expect(r.lineHeight).toBe(1.4)
  })
  it("uses the per-type global size by item type", () => {
    expect(resolveTextStyle(item({ type: "title" }), cfg()).fontSize).toBe(DEFAULT_CONFIG.fontSizeTitle)
    expect(resolveTextStyle(item({ type: "role" }), cfg()).fontSize).toBe(DEFAULT_CONFIG.fontSizeRole)
  })
  it("applies per-item overrides over globals", () => {
    const r = resolveTextStyle(
      item({ fontSize: 99, color: "#ff0000", fontFamily: "'Roboto', sans-serif", letterSpacing: -1, lineHeight: 2 }),
      cfg(),
    )
    expect(r.fontSize).toBe(99)
    expect(r.color).toBe("#ff0000")
    expect(r.fontFamily).toBe("'Roboto', sans-serif")
    expect(r.letterSpacing).toBe(-1)
    expect(r.lineHeight).toBe(2)
  })
  it("ignores non-positive fontSize and lineHeight, falling back to global", () => {
    const c = cfg({ lineHeight: 1.5 })
    const r = resolveTextStyle(item({ type: "name", fontSize: 0, lineHeight: 0 }), c)
    expect(r.fontSize).toBe(c.fontSizeName)
    expect(r.lineHeight).toBe(1.5)
  })
  it("allows a letterSpacing override of 0", () => {
    expect(resolveTextStyle(item({ letterSpacing: 0 }), cfg({ letterSpacing: 5 })).letterSpacing).toBe(0)
  })
  it("treats whitespace-only color and fontFamily as unset", () => {
    const c = cfg({ textColor: "#abcdef", fontFamily: "'Inter', sans-serif" })
    const r = resolveTextStyle(item({ color: "   ", fontFamily: "  " }), c)
    expect(r.color).toBe("#abcdef")
    expect(r.fontFamily).toBe("'Inter', sans-serif")
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
