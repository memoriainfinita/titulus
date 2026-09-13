// Embedded font CSS goes into the SVG of EVERY captured frame, and the browser
// re-parses it on each image load. The full Google Fonts CSS with data URLs is
// several MB (each declared weight repeats the same variable woff2), which made
// the SVG load the dominant per-frame cost. These helpers keep only the
// @font-face rules a frame actually needs.

export interface ParsedFontFace {
  css: string
  family: string
  style: string
  weightMin: number
  weightMax: number
  // null = no unicode-range (covers everything)
  ranges: [number, number][] | null
}

export interface FontUsage {
  family: string
  weight: number
  style: string
}

export function normalizeFamily(name: string): string {
  return name.trim().replace(/^["']|["']$/g, "").toLowerCase()
}

function descriptor(block: string, name: string): string | null {
  const m = block.match(new RegExp(`${name}\\s*:\\s*([^;}]+)`, "i"))
  return m ? m[1].trim() : null
}

function parseRanges(value: string): [number, number][] {
  return value.split(",").map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, "").split("-")
    // "U+4??" wildcard form: ? spans 0-F
    if (from.includes("?")) {
      return [parseInt(from.replace(/\?/g, "0"), 16), parseInt(from.replace(/\?/g, "F"), 16)]
    }
    return [parseInt(from, 16), parseInt(to ?? from, 16)]
  })
}

export function parseFontFaces(css: string): ParsedFontFace[] {
  const blocks = css.match(/@font-face\s*{[^}]*}/g) ?? []
  return blocks.map((block) => {
    const weights = (descriptor(block, "font-weight") ?? "400").split(/\s+/).map(Number)
    const unicodeRange = descriptor(block, "unicode-range")
    return {
      css: block,
      family: normalizeFamily(descriptor(block, "font-family") ?? ""),
      style: (descriptor(block, "font-style") ?? "normal").toLowerCase(),
      weightMin: weights[0],
      weightMax: weights[1] ?? weights[0],
      ranges: unicodeRange ? parseRanges(unicodeRange) : null,
    }
  })
}

// For each usage, pick the faces of its family with matching style and weight.
// When the exact style or weight is missing, keep the whole family (style
// first, then weight) so the browser can do its normal font matching or
// synthesis inside the SVG instead of falling back to another font.
export function selectFontFaces(faces: ParsedFontFace[], usages: FontUsage[], codepoints: Iterable<number>): string {
  const cps = [...codepoints]
  const selected = new Set<ParsedFontFace>()

  for (const usage of usages) {
    const family = faces.filter((f) => f.family === normalizeFamily(usage.family))
    if (family.length === 0) continue
    const styled = family.filter((f) => f.style === usage.style.toLowerCase())
    const byStyle = styled.length > 0 ? styled : family
    const weighted = byStyle.filter((f) => usage.weight >= f.weightMin && usage.weight <= f.weightMax)
    for (const f of weighted.length > 0 ? weighted : byStyle) selected.add(f)
  }

  return faces
    .filter((f) => selected.has(f))
    .filter((f) => f.ranges === null || cps.some((c) => f.ranges!.some(([a, z]) => c >= a && c <= z)))
    .map((f) => f.css)
    .join("\n")
}
