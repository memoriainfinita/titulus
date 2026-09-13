import { describe, it, expect } from "vitest"
import { normalizeFamily, parseFontFaces, selectFontFaces } from "./fontSubset"
import { buildFontFaceRule } from "./fonts"

const face = (family: string, weight: string, style: string, range?: string) =>
  `@font-face {\n  font-family: '${family}';\n  font-style: ${style};\n  font-weight: ${weight};\n  src: url(data:font/woff2;base64,AAAA) format('woff2');\n${range ? `  unicode-range: ${range};\n` : ""}}`

const LATIN = "U+0000-00FF, U+0131, U+2000-206F"
const CYRILLIC = "U+0301, U+0400-045F"

describe("normalizeFamily", () => {
  it("strips quotes and lowercases", () => {
    expect(normalizeFamily(` "Playfair Display" `)).toBe("playfair display")
    expect(normalizeFamily("'Inter'")).toBe("inter")
  })
})

describe("parseFontFaces", () => {
  it("parses family, style, single weight and unicode ranges", () => {
    const [f] = parseFontFaces(face("Inter", "700", "italic", LATIN))
    expect(f.family).toBe("inter")
    expect(f.style).toBe("italic")
    expect([f.weightMin, f.weightMax]).toEqual([700, 700])
    expect(f.ranges).toEqual([
      [0, 0xff],
      [0x131, 0x131],
      [0x2000, 0x206f],
    ])
  })

  it("parses weight ranges and missing unicode-range", () => {
    const [f] = parseFontFaces(face("Custom", "100 900", "normal"))
    expect([f.weightMin, f.weightMax]).toEqual([100, 900])
    expect(f.ranges).toBeNull()
  })

  it("expands wildcard ranges", () => {
    const [f] = parseFontFaces(face("X", "400", "normal", "U+4??"))
    expect(f.ranges).toEqual([[0x400, 0x4ff]])
  })

  it("parses the custom font rule built by buildFontFaceRule", () => {
    const rule = buildFontFaceRule("'MyFont'", "data:font/ttf;base64,AAAA")
    const faces = parseFontFaces(rule)
    expect(faces).toHaveLength(1)
    expect(faces[0]).toMatchObject({ family: "myfont", style: "normal", weightMin: 400, weightMax: 400, ranges: null })
    const out = selectFontFaces(faces, [{ family: "MyFont", weight: 700, style: "italic" }], [65])
    expect(out).toBe(rule)
  })

  it("splits multiple blocks", () => {
    const css = [face("A", "400", "normal"), face("B", "400", "normal")].join("\n")
    expect(parseFontFaces(css).map((f) => f.family)).toEqual(["a", "b"])
  })
})

describe("selectFontFaces", () => {
  const css = [
    face("Inter", "400", "normal", CYRILLIC),
    face("Inter", "400", "normal", LATIN),
    face("Inter", "700", "normal", LATIN),
    face("Inter", "400", "italic", LATIN),
    face("Roboto", "400", "normal", LATIN),
    face("Bebas Neue", "400", "normal", LATIN),
  ].join("\n")
  const faces = parseFontFaces(css)
  const latinText = [..."Hola"].map((c) => c.codePointAt(0)!)
  const families = (out: string) => parseFontFaces(out).map((f) => `${f.family}|${f.weightMin}|${f.style}`)

  it("keeps only the used family, weight, style and subset", () => {
    const out = selectFontFaces(faces, [{ family: "Inter", weight: 400, style: "normal" }], latinText)
    expect(families(out)).toEqual(["inter|400|normal"])
    expect(out).not.toContain("U+0400-045F")
  })

  it("includes a subset when the text needs it", () => {
    const out = selectFontFaces(faces, [{ family: "Inter", weight: 400, style: "normal" }], [0x416])
    expect(out).toContain("U+0400-045F")
    expect(out).not.toContain("U+0000-00FF")
  })

  it("falls back to all weights of the style when the weight is missing", () => {
    const out = selectFontFaces(faces, [{ family: "Bebas Neue", weight: 700, style: "normal" }], latinText)
    expect(families(out)).toEqual(["bebas neue|400|normal"])
  })

  it("falls back to the whole family when the style is missing", () => {
    const out = selectFontFaces(faces, [{ family: "Roboto", weight: 400, style: "italic" }], latinText)
    expect(families(out)).toEqual(["roboto|400|normal"])
  })

  it("ignores usages whose family is not embedded", () => {
    expect(selectFontFaces(faces, [{ family: "sans-serif", weight: 400, style: "normal" }], latinText)).toBe("")
  })

  it("keeps faces without unicode-range regardless of text", () => {
    const custom = parseFontFaces(face("Custom", "400", "normal"))
    expect(selectFontFaces(custom, [{ family: "Custom", weight: 400, style: "normal" }], [])).toContain("'Custom'")
  })

  it("does not duplicate faces used by several usages", () => {
    const out = selectFontFaces(
      faces,
      [
        { family: "Inter", weight: 700, style: "normal" },
        { family: "Inter", weight: 700, style: "normal" },
      ],
      latinText,
    )
    expect(families(out)).toEqual(["inter|700|normal"])
  })
})
