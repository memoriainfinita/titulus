import { describe, it, expect } from "vitest"
import {
  buildGoogleFontUrl,
  buildCombinedGoogleFontUrl,
  buildFontFaceRule,
  fontFormatFromDataUrl,
  fontFaceStyleId,
} from "./fonts"

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

describe("fontFormatFromDataUrl", () => {
  it("maps known font mime types to format hints", () => {
    expect(fontFormatFromDataUrl("data:font/ttf;base64,AA")).toBe("truetype")
    expect(fontFormatFromDataUrl("data:font/otf;base64,AA")).toBe("opentype")
    expect(fontFormatFromDataUrl("data:font/woff2;base64,AA")).toBe("woff2")
    expect(fontFormatFromDataUrl("data:font/woff;base64,AA")).toBe("woff")
  })

  it("returns undefined for an unknown or generic mime", () => {
    expect(fontFormatFromDataUrl("data:application/octet-stream;base64,AA")).toBeUndefined()
  })
})

describe("buildFontFaceRule", () => {
  it("quotes the data url src and includes family and swap", () => {
    const rule = buildFontFaceRule("'My Font'", "data:font/ttf;base64,AAAA")
    expect(rule).toContain("font-family: 'My Font'")
    expect(rule).toContain(`url("data:font/ttf;base64,AAAA")`)
    expect(rule).toContain("format('truetype')")
    expect(rule).toContain("font-display: swap")
  })

  it("omits the format hint when the mime is unknown", () => {
    const rule = buildFontFaceRule("'X'", "data:application/octet-stream;base64,AAAA")
    expect(rule).not.toContain("format(")
    expect(rule).toContain(`url("data:application/octet-stream;base64,AAAA")`)
  })
})

describe("fontFaceStyleId", () => {
  it("builds a stable, sanitized id from the font name", () => {
    expect(fontFaceStyleId("My Font 2")).toBe("font-face-my-font-2")
    expect(fontFaceStyleId("Ácido!")).toBe("font-face--cido-")
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
