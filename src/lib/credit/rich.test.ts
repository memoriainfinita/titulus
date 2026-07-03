import { describe, it, expect } from "vitest"
import { plainToRich, richToPlain, sliceRuns, isValidRich, fontInUseByItems } from "./rich"
import { CreditItem, Rich } from "./types"

describe("plainToRich / richToPlain", () => {
  it("splits plain text into one unstyled run per line", () => {
    expect(plainToRich("Hola\nMundo")).toEqual([[{ text: "Hola" }], [{ text: "Mundo" }]])
  })

  it("empty text becomes a single line with an empty run", () => {
    expect(plainToRich("")).toEqual([[{ text: "" }]])
  })

  it("round-trips through richToPlain", () => {
    expect(richToPlain(plainToRich("A\nB\nC"))).toBe("A\nB\nC")
  })

  it("richToPlain joins runs within a line without separators", () => {
    const rich: Rich = [[{ text: "Ho" }, { text: "la", style: { bold: true } }], [{ text: "B" }]]
    expect(richToPlain(rich)).toBe("Hola\nB")
  })
})

describe("sliceRuns", () => {
  const rich: Rich = [
    [{ text: "ab" }, { text: "cd", style: { bold: true } }],
    [{ text: "ef" }],
  ]

  it("cuts mid-run preserving the run style", () => {
    expect(sliceRuns(rich, 3)).toEqual([[{ text: "ab" }, { text: "c", style: { bold: true } }]])
  })

  it("counts the newline between lines as one typed char", () => {
    // "abcd" = 4 chars, newline = 5th, "e" = 6th
    expect(sliceRuns(rich, 5)).toEqual([[{ text: "ab" }, { text: "cd", style: { bold: true } }], []])
    expect(sliceRuns(rich, 6)).toEqual([[{ text: "ab" }, { text: "cd", style: { bold: true } }], [{ text: "e" }]])
  })

  it("returns everything when nChars covers the full text", () => {
    expect(sliceRuns(rich, 99)).toEqual(rich)
  })

  it("returns one empty line for nChars 0", () => {
    expect(sliceRuns(rich, 0)).toEqual([[]])
  })
})

describe("isValidRich", () => {
  it("accepts lines of runs with optional style object", () => {
    expect(isValidRich([[{ text: "a" }], [{ text: "b", style: { bold: true } }]])).toBe(true)
    expect(isValidRich([[]])).toBe(true)
  })

  it("rejects non-arrays, runs without string text, and non-object styles", () => {
    expect(isValidRich("x")).toBe(false)
    expect(isValidRich([{ text: "a" }])).toBe(false) // line must be an array
    expect(isValidRich([[{ text: 1 }]])).toBe(false)
    expect(isValidRich([[{ text: "a", style: "bold" }]])).toBe(false)
    expect(isValidRich([[null]])).toBe(false)
  })
})

describe("fontInUseByItems", () => {
  const items: CreditItem[] = [
    { id: "a", type: "text", text: "x", rich: [[{ text: "x", style: { fontFamily: "'Lobster', display" } }]] },
    { id: "b", type: "text", text: "y" },
  ]

  it("finds a family used by any run", () => {
    expect(fontInUseByItems(items, "'Lobster', display")).toBe(true)
  })

  it("returns false for unused families and items without rich", () => {
    expect(fontInUseByItems(items, "'Inter', sans-serif")).toBe(false)
  })
})
