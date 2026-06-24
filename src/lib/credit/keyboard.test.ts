import { describe, it, expect } from "vitest"
import { isInteractiveTarget } from "./keyboard"

describe("isInteractiveTarget", () => {
  it("returns false for null and non-elements", () => {
    expect(isInteractiveTarget(null)).toBe(false)
  })
  it("returns true for form/interactive elements", () => {
    for (const tag of ["input", "textarea", "select", "button"]) {
      expect(isInteractiveTarget(document.createElement(tag))).toBe(true)
    }
  })
  it("returns true for contentEditable elements", () => {
    const el = document.createElement("div")
    el.setAttribute("contenteditable", "true")
    expect(isInteractiveTarget(el)).toBe(true)
  })
  it("returns true for role=button", () => {
    const el = document.createElement("div")
    el.setAttribute("role", "button")
    expect(isInteractiveTarget(el)).toBe(true)
  })
  it("returns false for a plain div", () => {
    expect(isInteractiveTarget(document.createElement("div"))).toBe(false)
  })
})
