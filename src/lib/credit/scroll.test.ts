import { describe, it, expect } from "vitest"
import {
  getScrollTotalDistance,
  getScrollDurationSec,
  getScrollTranslateY,
  stepScrollProgress,
  scrollProgressForItem,
  activeItemIndexAtProgress,
} from "./scroll"

describe("scrollProgressForItem / activeItemIndexAtProgress", () => {
  // Geometría: contentHeight 1000, containerHeight 200, total = 1200, ref center = 100.
  it("scrollProgressForItem centra el item en la línea de referencia (up)", () => {
    // item top=400 height=100 -> center 450. up: p=(200+450-100)/1200
    const p = scrollProgressForItem(400, 100, 1000, 200, "up", 0.5)
    expect(p).toBeCloseTo((200 + 450 - 100) / 1200, 5)
  })

  it("scrollProgressForItem clamp a [0,1]", () => {
    expect(scrollProgressForItem(-9999, 0, 1000, 200, "up", 0.5)).toBe(0)
    expect(scrollProgressForItem(9999, 0, 1000, 200, "up", 0.5)).toBe(1)
  })

  it("activeItemIndexAtProgress: -1 si no hay items", () => {
    expect(activeItemIndexAtProgress([], 1000, 200, "up", 0.5, 0.5)).toBe(-1)
  })

  it("activeItemIndexAtProgress: item cuyo top ya pasó la referencia (up)", () => {
    const offsets = [
      { top: 0, height: 100 },
      { top: 100, height: 100 },
      { top: 200, height: 100 },
    ]
    const p = scrollProgressForItem(100, 100, 1000, 200, "up", 0.5)
    expect(activeItemIndexAtProgress(offsets, 1000, 200, "up", p, 0.5)).toBe(1)
  })

  it("activeItemIndexAtProgress: antes del primero devuelve 0", () => {
    const offsets = [{ top: 500, height: 100 }, { top: 700, height: 100 }]
    expect(activeItemIndexAtProgress(offsets, 1000, 200, "up", 0, 0.5)).toBe(0)
  })
})

describe("getScrollTotalDistance", () => {
  it("sums content and container height", () => {
    expect(getScrollTotalDistance(1000, 720)).toBe(1720)
  })

  it("is zero when both are zero", () => {
    expect(getScrollTotalDistance(0, 0)).toBe(0)
  })
})

describe("getScrollDurationSec", () => {
  it("divides total distance by speed", () => {
    // (1000 + 720) / 60
    expect(getScrollDurationSec(1000, 720, 60)).toBeCloseTo(1720 / 60)
  })

  it("returns 0 when there is nothing to scroll", () => {
    expect(getScrollDurationSec(0, 0, 60)).toBe(0)
  })

  it("returns 0 for non-positive speed instead of dividing by zero", () => {
    expect(getScrollDurationSec(1000, 720, 0)).toBe(0)
  })
})

describe("getScrollTranslateY", () => {
  const content = 1000
  const container = 720
  const total = content + container

  it("up: starts just below the stage at progress 0", () => {
    expect(getScrollTranslateY(content, container, "up", 0)).toBe(container)
  })

  it("up: ends fully above the stage at progress 1", () => {
    expect(getScrollTranslateY(content, container, "up", 1)).toBe(container - total)
    expect(getScrollTranslateY(content, container, "up", 1)).toBe(-content)
  })

  it("down: starts fully above the stage at progress 0", () => {
    expect(getScrollTranslateY(content, container, "down", 0)).toBe(-content)
  })

  it("down: ends just below the stage at progress 1", () => {
    expect(getScrollTranslateY(content, container, "down", 1)).toBe(container)
  })

  it("up: is monotonically decreasing as progress grows", () => {
    const a = getScrollTranslateY(content, container, "up", 0.25)
    const b = getScrollTranslateY(content, container, "up", 0.75)
    expect(b).toBeLessThan(a)
  })
})

describe("stepScrollProgress", () => {
  it("advances by deltaSec / durationSec while below the end", () => {
    const step = stepScrollProgress(0, 1, 10, true, 3)
    expect(step).toEqual({ kind: "run", progress: 0.1 })
  })

  it("keeps running from a mid value", () => {
    const step = stepScrollProgress(0.5, 1, 10, true, 3)
    expect(step).toEqual({ kind: "run", progress: 0.6 })
  })

  it("does not move when deltaSec is 0", () => {
    expect(stepScrollProgress(0.4, 0, 10, true, 3)).toEqual({ kind: "run", progress: 0.4 })
  })

  it("stops at the end when looping is disabled", () => {
    expect(stepScrollProgress(0.95, 1, 10, false, 3)).toEqual({ kind: "stop" })
  })

  it("signals a pause at the end when looping with a positive end pause", () => {
    expect(stepScrollProgress(0.95, 1, 10, true, 3)).toEqual({ kind: "pause" })
  })

  it("wraps straight back to the start when looping with no end pause", () => {
    expect(stepScrollProgress(0.95, 1, 10, true, 0)).toEqual({ kind: "wrap" })
  })

  it("treats exactly reaching 1 as the end, not as still running", () => {
    // 0.9 + 1/10 === 1.0 -> end branch, not a run with progress 1
    expect(stepScrollProgress(0.9, 1, 10, true, 3)).toEqual({ kind: "pause" })
  })

  it("re-emits pause every frame while held at the end (component guards the timer)", () => {
    expect(stepScrollProgress(1, 0.5, 10, true, 3)).toEqual({ kind: "pause" })
  })

  it("freezes (no division by zero) when duration is non-positive", () => {
    expect(stepScrollProgress(0.3, 1, 0, true, 3)).toEqual({ kind: "run", progress: 0.3 })
  })
})
