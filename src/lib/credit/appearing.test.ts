import { describe, it, expect } from "vitest"
import {
  getAppearItemDuration,
  resolveAnimationType,
  resolveAnimationDuration,
  resolveAnimationTunables,
  resolveTypewriterSpeed,
  resolveLineRevealInterval,
  resolveStaggerLines,
  isLineStaggered,
  revealedLinesAt,
  typedCharsAt,
} from "./appearing"
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

describe("per-item animation resolvers", () => {
  const config = makeConfig({
    animationType: "fade",
    animationDuration: 1.5,
    animSlideDistance: 80,
    animBlurAmount: 20,
    animZoomFrom: 0.6,
    animZoomTo: 1.4,
  })

  it("resolveAnimationType inherits the global type by default", () => {
    expect(resolveAnimationType(makeItem(), config)).toBe("fade")
  })

  it("resolveAnimationType uses the per-item override", () => {
    expect(resolveAnimationType(makeItem({ animationType: "zoom" }), config)).toBe("zoom")
  })

  it("resolveAnimationDuration inherits the global value, then overrides when > 0", () => {
    expect(resolveAnimationDuration(makeItem(), config)).toBe(1.5)
    expect(resolveAnimationDuration(makeItem({ animationDuration: 3 }), config)).toBe(3)
  })

  it("resolveAnimationDuration ignores a non-positive override", () => {
    expect(resolveAnimationDuration(makeItem({ animationDuration: 0 }), config)).toBe(1.5)
  })

  it("resolveAnimationTunables falls back per field but allows 0/negatives", () => {
    expect(resolveAnimationTunables(makeItem(), config)).toEqual({
      slide: 80,
      blur: 20,
      zoomFrom: 0.6,
      zoomTo: 1.4,
    })
    const overridden = resolveAnimationTunables(
      makeItem({ animSlideDistance: 0, animBlurAmount: 5 }),
      config,
    )
    expect(overridden.slide).toBe(0)
    expect(overridden.blur).toBe(5)
    expect(overridden.zoomFrom).toBe(0.6)
  })

  it("getAppearItemDuration honors a per-item animation type and duration", () => {
    // Item forces typewriter even though global is fade -> typing time, not duration
    const tw = getAppearItemDuration(makeItem({ text: "Hola", animationType: "typewriter", pauseOverride: 0 }), config)
    expect(tw).toBe(2)
    // Item overrides the duration of a fade
    const faded = getAppearItemDuration(makeItem({ animationDuration: 4, pauseOverride: 0 }), config)
    expect(faded).toBe(4)
  })
})

describe("resolveTypewriterSpeed", () => {
  const config = makeConfig({ typewriterSpeed: 50 })

  it("inherits the global speed by default", () => {
    expect(resolveTypewriterSpeed(makeItem(), config)).toBe(50)
  })

  it("uses a positive per-item override", () => {
    expect(resolveTypewriterSpeed(makeItem({ typewriterSpeed: 120 }), config)).toBe(120)
  })

  it("ignores a non-positive override and inherits the global speed", () => {
    expect(resolveTypewriterSpeed(makeItem({ typewriterSpeed: 0 }), config)).toBe(50)
    expect(resolveTypewriterSpeed(makeItem({ typewriterSpeed: -10 }), config)).toBe(50)
  })

  it("getAppearItemDuration scales typing time with a per-item speed", () => {
    const cfg = makeConfig({ animationType: "typewriter", typewriterSpeed: 50, pauseDuration: 0 })
    const text = "x".repeat(100) // 100 chars * 100ms = 10s
    expect(getAppearItemDuration(makeItem({ text, typewriterSpeed: 100, pauseOverride: 0 }), cfg)).toBe(10)
  })
})

describe("resolveLineRevealInterval", () => {
  const config = makeConfig({ lineRevealInterval: 0.4 })

  it("inherits the global interval by default", () => {
    expect(resolveLineRevealInterval(makeItem(), config)).toBe(0.4)
  })

  it("uses a positive per-item override", () => {
    expect(resolveLineRevealInterval(makeItem({ lineRevealInterval: 1 }), config)).toBe(1)
  })

  it("ignores a non-positive override and inherits the global interval", () => {
    expect(resolveLineRevealInterval(makeItem({ lineRevealInterval: 0 }), config)).toBe(0.4)
    expect(resolveLineRevealInterval(makeItem({ lineRevealInterval: -1 }), config)).toBe(0.4)
  })
})

describe("resolveStaggerLines", () => {
  it("inherits the global flag by default", () => {
    expect(resolveStaggerLines(makeItem(), makeConfig({ staggerLines: true }))).toBe(true)
    expect(resolveStaggerLines(makeItem(), makeConfig({ staggerLines: false }))).toBe(false)
  })

  it("uses the per-item override when set", () => {
    expect(resolveStaggerLines(makeItem({ staggerLines: false }), makeConfig({ staggerLines: true }))).toBe(false)
    expect(resolveStaggerLines(makeItem({ staggerLines: true }), makeConfig({ staggerLines: false }))).toBe(true)
  })
})

describe("isLineStaggered", () => {
  const config = makeConfig({ staggerLines: true, animationType: "fade" })

  it("is true when the flag is on, type is not typewriter and there is more than one line", () => {
    expect(isLineStaggered(makeItem({ text: "A\nB" }), config)).toBe(true)
  })

  it("is false for a single line", () => {
    expect(isLineStaggered(makeItem({ text: "A" }), config)).toBe(false)
  })

  it("is false when the flag is off", () => {
    expect(isLineStaggered(makeItem({ text: "A\nB" }), makeConfig({ staggerLines: false }))).toBe(false)
  })

  it("is false for typewriter even with the flag on", () => {
    expect(isLineStaggered(makeItem({ text: "A\nB", animationType: "typewriter" }), config)).toBe(false)
  })
})

describe("getAppearItemDuration (line-by-line)", () => {
  // reveal = (nLines - 1) * interval + animationDuration ; total = reveal + pause
  const config = makeConfig({
    staggerLines: true,
    animationType: "fade",
    animationDuration: 1, // per-line entrance
    lineRevealInterval: 0.5,
    pauseDuration: 2,
  })

  it("a single line is not staggered (plain entrance)", () => {
    // 0 extra lines: 1 + 2 = 3
    expect(getAppearItemDuration(makeItem({ text: "Una sola" }), config)).toBe(3)
  })

  it("staggers each extra line by the interval", () => {
    // 3 lines: (3-1)*0.5 + 1 = 2 ; + 2 = 4
    expect(getAppearItemDuration(makeItem({ text: "A\nB\nC" }), config)).toBe(4)
  })

  it("honors a per-item interval override", () => {
    // interval 1: (3-1)*1 + 1 = 3 ; + pause override 0 = 3
    expect(
      getAppearItemDuration(makeItem({ text: "A\nB\nC", lineRevealInterval: 1, pauseOverride: 0 }), config),
    ).toBe(3)
  })

  it("ignores the stagger when the per-item flag turns it off", () => {
    // staggerLines false on item: 1 + 2 = 3 regardless of line count
    expect(
      getAppearItemDuration(makeItem({ text: "A\nB\nC", staggerLines: false }), config),
    ).toBe(3)
  })

  it("combines with a non-fade type (blur) using its animationDuration", () => {
    const cfg = makeConfig({ staggerLines: true, animationType: "blur", animationDuration: 0.8, lineRevealInterval: 0.5, pauseDuration: 0 })
    // 2 lines: (2-1)*0.5 + 0.8 = 1.3
    expect(getAppearItemDuration(makeItem({ text: "A\nB" }), cfg)).toBeCloseTo(1.3)
  })
})

describe("revealedLinesAt", () => {
  it("muestra 1 línea en t=0 y suma una por intervalo", () => {
    expect(revealedLinesAt(0, 0.5, 3)).toBe(1)
    expect(revealedLinesAt(0.5, 0.5, 3)).toBe(2)
    expect(revealedLinesAt(1.0, 0.5, 3)).toBe(3)
  })

  it("satura en totalLines", () => {
    expect(revealedLinesAt(99, 0.5, 3)).toBe(3)
  })

  it("una sola línea siempre es 1", () => {
    expect(revealedLinesAt(0, 0.5, 1)).toBe(1)
    expect(revealedLinesAt(5, 0.5, 1)).toBe(1)
  })

  it("intervalo <= 0 revela todo de golpe", () => {
    expect(revealedLinesAt(0, 0, 4)).toBe(4)
  })
})

describe("typedCharsAt", () => {
  it("texto vacío teclea 0", () => {
    expect(typedCharsAt(5, 0, 50)).toBe(0)
  })

  it("progresa linealmente sobre la duración de tecleo", () => {
    // 100 chars * 100ms = 10s de tecleo; a la mitad -> 50 chars
    expect(typedCharsAt(5, 100, 100)).toBe(50)
    expect(typedCharsAt(10, 100, 100)).toBe(100)
  })

  it("la duración de tecleo tiene un suelo de 2s", () => {
    // 4 chars * 50ms = 0.2s -> max(2, 0.2) = 2s; a 1s -> mitad -> 2 chars
    expect(typedCharsAt(1, 4, 50)).toBe(2)
  })
})
