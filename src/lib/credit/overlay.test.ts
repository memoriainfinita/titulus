import { describe, it, expect } from "vitest"
import { resolveOverlay, overlayOpacityAt, overlayStartSec, OVERLAY_DEFAULTS } from "./overlay"
import { isValidImportedItems } from "./store"
import { CreditItem } from "./types"

function overlay(patch: Partial<CreditItem> = {}): CreditItem {
  return { id: "o", type: "overlay", text: "", ...patch }
}

describe("resolveOverlay", () => {
  it("uses the defaults without overrides", () => {
    expect(resolveOverlay(overlay())).toEqual(OVERLAY_DEFAULTS)
    expect(OVERLAY_DEFAULTS).toEqual({ x: 50, y: 50, duration: 4, fade: 0.5, layer: "front" })
  })

  it("takes valid overrides, including 0 for position and fade", () => {
    expect(resolveOverlay(overlay({ overlayX: 0, overlayY: 100, overlayDuration: 6, overlayFade: 0, overlayLayer: "back" }))).toEqual({
      x: 0, y: 100, duration: 6, fade: 0, layer: "back",
    })
  })

  it("clamps position to 0-100 and ignores non-positive duration", () => {
    const r = resolveOverlay(overlay({ overlayX: -20, overlayY: 150, overlayDuration: 0 }))
    expect(r.x).toBe(0)
    expect(r.y).toBe(100)
    expect(r.duration).toBe(OVERLAY_DEFAULTS.duration)
  })

  it("caps the fade at half the duration so in and out never overlap", () => {
    expect(resolveOverlay(overlay({ overlayDuration: 1, overlayFade: 2 })).fade).toBe(0.5)
    expect(resolveOverlay(overlay({ overlayFade: -1 })).fade).toBe(OVERLAY_DEFAULTS.fade)
  })
})

describe("overlayOpacityAt", () => {
  it("is hidden before the start and after the end", () => {
    expect(overlayOpacityAt(9.99, 10, 4, 0.5)).toBe(0)
    expect(overlayOpacityAt(14.01, 10, 4, 0.5)).toBe(0)
  })

  it("fades in, holds and fades out", () => {
    expect(overlayOpacityAt(10, 10, 4, 0.5)).toBe(0)
    expect(overlayOpacityAt(10.25, 10, 4, 0.5)).toBeCloseTo(0.5)
    expect(overlayOpacityAt(12, 10, 4, 0.5)).toBe(1)
    expect(overlayOpacityAt(13.75, 10, 4, 0.5)).toBeCloseTo(0.5)
    expect(overlayOpacityAt(14, 10, 4, 0.5)).toBe(0)
  })

  it("is fully visible for its whole span without fade", () => {
    expect(overlayOpacityAt(10, 10, 4, 0)).toBe(1)
    expect(overlayOpacityAt(14, 10, 4, 0)).toBe(1)
  })
})

describe("overlayStartSec", () => {
  // content 1000px, container 500px -> total distance 1500px over 30s.
  it("starts when the marker reaches the stage center (scroll up)", () => {
    // up: marker at top 250 hits center (250) when translateY = 0 -> p = 500/1500
    expect(overlayStartSec(250, 1000, 500, "up", 30)).toBeCloseTo(10)
  })

  it("mirrors the geometry for scroll down", () => {
    // down: translateY = -1000 + p*1500; 250 + translateY = 250 -> p = 1000/1500
    expect(overlayStartSec(250, 1000, 500, "down", 30)).toBeCloseTo(20)
  })

  it("is 0 when there is nothing to scroll", () => {
    expect(overlayStartSec(0, 0, 0, "up", 0)).toBe(0)
  })
})

describe("overlay import", () => {
  it("accepts overlay items in imported projects", () => {
    expect(isValidImportedItems([overlay({ imageSrc: "data:image/png;base64,AA", overlayX: 80 })])).toBe(true)
  })
})
