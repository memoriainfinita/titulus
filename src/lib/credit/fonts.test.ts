import { describe, it, expect } from "vitest"
import { buildGoogleFontUrl, buildCombinedGoogleFontUrl } from "./fonts"

describe("buildGoogleFontUrl", () => {
  it("encodes spaces in the family name as plus signs", () => {
    const url = buildGoogleFontUrl("Playfair Display", ["400"])
    expect(url).toContain("family=Playfair+Display")
  })

  it("omits the weight axis for a single weight", () => {
    const url = buildGoogleFontUrl("Inter", ["400"])
    expect(url).not.toContain(":wght@")
    expect(url).toBe(
      "https://fonts.googleapis.com/css2?family=Inter&display=swap",
    )
  })

  it("joins multiple weights with semicolons on the wght axis", () => {
    const url = buildGoogleFontUrl("Inter", ["300", "400", "700"])
    expect(url).toContain(":wght@300;400;700")
  })

  it("defaults to 400 and 700 weights when none are given", () => {
    const url = buildGoogleFontUrl("Roboto")
    expect(url).toContain(":wght@400;700")
  })

  it("always requests display=swap", () => {
    expect(buildGoogleFontUrl("Lato", ["400"])).toContain("display=swap")
  })
})

describe("buildCombinedGoogleFontUrl", () => {
  it("concatenates multiple families into one request", () => {
    const url = buildCombinedGoogleFontUrl([
      { family: "Inter", weights: ["400"] },
      { family: "Playfair Display", weights: ["400", "700"] },
    ])
    expect(url).toContain("family=Inter")
    expect(url).toContain("family=Playfair+Display:wght@400;700")
    expect(url).toContain("display=swap")
  })
})
