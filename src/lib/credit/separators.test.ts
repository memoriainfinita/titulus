import { describe, it, expect } from "vitest"
import { resolveSpacerHeight, resolveDivider } from "./separators"
import { DEFAULT_CONFIG, CreditItem, CreditConfig } from "./types"

function cfg(patch: Partial<CreditConfig> = {}): CreditConfig {
  return { ...DEFAULT_CONFIG, ...patch }
}
function spacer(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "s", type: "spacer", text: "", ...patch }
}
function divider(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "d", type: "divider", text: "", ...patch }
}

describe("resolveSpacerHeight", () => {
  it("uses the global height when no override", () => {
    expect(resolveSpacerHeight(spacer(), cfg({ spacerHeight: 48 }))).toBe(48)
  })
  it("uses the item override when set", () => {
    expect(resolveSpacerHeight(spacer({ spacerHeight: 120 }), cfg())).toBe(120)
  })
  it("allows an override of 0", () => {
    expect(resolveSpacerHeight(spacer({ spacerHeight: 0 }), cfg({ spacerHeight: 48 }))).toBe(0)
  })
  it("ignores a negative override and falls back to global", () => {
    expect(resolveSpacerHeight(spacer({ spacerHeight: -10 }), cfg({ spacerHeight: 48 }))).toBe(48)
  })
})

describe("resolveDivider", () => {
  it("inherits all global values when no overrides", () => {
    const r = resolveDivider(divider(), cfg({
      dividerThickness: 2, dividerWidth: 70, dividerOpacity: 0.5,
      dividerStyle: "dashed", dividerColor: "#ff0000",
    }))
    expect(r).toEqual({ thickness: 2, width: 70, opacity: 0.5, style: "dashed", color: "#ff0000" })
  })
  it("applies per-item overrides over globals", () => {
    const r = resolveDivider(
      divider({ dividerThickness: 4, dividerWidth: 100, dividerOpacity: 1, dividerStyle: "dotted", dividerColor: "#00ff00" }),
      cfg({ dividerThickness: 1, dividerColor: "#ff0000" }),
    )
    expect(r.thickness).toBe(4)
    expect(r.width).toBe(100)
    expect(r.opacity).toBe(1)
    expect(r.style).toBe("dotted")
    expect(r.color).toBe("#00ff00")
  })
  it("falls back to textColor when neither item nor global color is set", () => {
    const r = resolveDivider(divider(), cfg({ dividerColor: "", textColor: "#abcdef" }))
    expect(r.color).toBe("#abcdef")
  })
  it("uses the global divider color over textColor when set", () => {
    const r = resolveDivider(divider(), cfg({ dividerColor: "#123456", textColor: "#abcdef" }))
    expect(r.color).toBe("#123456")
  })
  it("treats a whitespace-only item color as unset", () => {
    const r = resolveDivider(divider({ dividerColor: "   " }), cfg({ dividerColor: "#123456" }))
    expect(r.color).toBe("#123456")
  })
})
