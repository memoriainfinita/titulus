import { describe, it, expect } from "vitest"
import { getVariants } from "./AppearingCredits"
import { AnimationTunables } from "@/lib/credit/appearing"

const t: AnimationTunables = { slide: 80, blur: 20, zoomFrom: 0.6, zoomTo: 1.4 }

// Structural view of the variants object for assertions.
type VariantShape = {
  initial: Record<string, string | number>
  animate: Record<string, string | number>
  exit: Record<string, string | number>
  transition: { duration: number }
}

describe("getVariants", () => {
  it("applies the slide distance to slide-up", () => {
    const v = getVariants("slide-up", 1, { ...t, slide: 120 }) as unknown as VariantShape
    expect(v.initial.y).toBe(120)
    expect(v.exit.y).toBe(-120)
  })

  it("applies the slide distance to slide-left", () => {
    const v = getVariants("slide-left", 1, { ...t, slide: 50 }) as unknown as VariantShape
    expect(v.initial.x).toBe(50)
    expect(v.exit.x).toBe(-50)
  })

  it("applies the blur amount to the blur variant", () => {
    const v = getVariants("blur", 1, { ...t, blur: 8 }) as unknown as VariantShape
    expect(v.initial.filter).toBe("blur(8px)")
    expect(v.animate.filter).toBe("blur(0px)")
    expect(v.exit.filter).toBe("blur(8px)")
  })

  it("applies the zoom scales", () => {
    const v = getVariants("zoom", 1, { ...t, zoomFrom: 0.2, zoomTo: 2 }) as unknown as VariantShape
    expect(v.initial.scale).toBe(0.2)
    expect(v.exit.scale).toBe(2)
  })

  it("passes the duration through the transition", () => {
    const v = getVariants("fade", 3.5, t) as unknown as VariantShape
    expect(v.transition.duration).toBe(3.5)
  })
})
