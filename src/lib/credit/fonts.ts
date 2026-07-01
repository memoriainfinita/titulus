// Available Google Fonts (a curated selection)
// Users can also add their own custom fonts via file upload

export interface GoogleFont {
  family: string
  category: string
  weights: string[]
}

export const GOOGLE_FONTS: GoogleFont[] = [
  { family: "Inter", category: "sans-serif", weights: ["300", "400", "500", "600", "700", "800", "900"] },
  { family: "Roboto", category: "sans-serif", weights: ["100", "300", "400", "500", "700", "900"] },
  { family: "Open Sans", category: "sans-serif", weights: ["300", "400", "500", "600", "700", "800"] },
  { family: "Lato", category: "sans-serif", weights: ["100", "300", "400", "700", "900"] },
  { family: "Montserrat", category: "sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { family: "Poppins", category: "sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { family: "Raleway", category: "sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { family: "Oswald", category: "sans-serif", weights: ["200", "300", "400", "500", "600", "700"] },
  { family: "Playfair Display", category: "serif", weights: ["400", "500", "600", "700", "800", "900"] },
  { family: "Merriweather", category: "serif", weights: ["300", "400", "700", "900"] },
  { family: "Lora", category: "serif", weights: ["400", "500", "600", "700"] },
  { family: "PT Serif", category: "serif", weights: ["400", "700"] },
  { family: "Cormorant Garamond", category: "serif", weights: ["300", "400", "500", "600", "700"] },
  { family: "EB Garamond", category: "serif", weights: ["400", "500", "600", "700", "800"] },
  { family: "Bebas Neue", category: "display", weights: ["400"] },
  { family: "Anton", category: "display", weights: ["400"] },
  { family: "Cinzel", category: "serif", weights: ["400", "500", "600", "700", "800", "900"] },
  { family: "Cinzel Decorative", category: "display", weights: ["400", "700", "900"] },
  { family: "Abril Fatface", category: "display", weights: ["400"] },
  { family: "Pacifico", category: "display", weights: ["400"] },
  { family: "Lobster", category: "display", weights: ["400"] },
  { family: "Dancing Script", category: "handwriting", weights: ["400", "500", "600", "700"] },
  { family: "Great Vibes", category: "handwriting", weights: ["400"] },
  { family: "Sacramento", category: "handwriting", weights: ["400"] },
  { family: "Permanent Marker", category: "handwriting", weights: ["400"] },
  { family: "Shadows Into Light", category: "handwriting", weights: ["400"] },
  { family: "Special Elite", category: "display", weights: ["400"] },
  { family: "Courier Prime", category: "monospace", weights: ["400", "700"] },
  { family: "JetBrains Mono", category: "monospace", weights: ["100", "200", "300", "400", "500", "600", "700", "800"] },
  { family: "Source Code Pro", category: "monospace", weights: ["200", "300", "400", "500", "600", "700", "800", "900"] },
  { family: "Space Mono", category: "monospace", weights: ["400", "700"] },
  { family: "Fira Code", category: "monospace", weights: ["300", "400", "500", "600", "700"] },
  { family: "IBM Plex Mono", category: "monospace", weights: ["100", "200", "300", "400", "500", "600", "700"] },
  { family: "IBM Plex Sans", category: "sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700"] },
  { family: "IBM Plex Serif", category: "serif", weights: ["100", "200", "300", "400", "500", "600", "700"] },
  { family: "Work Sans", category: "sans-serif", weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] },
  { family: "Nunito", category: "sans-serif", weights: ["200", "300", "400", "500", "600", "700", "800", "900"] },
  { family: "Quicksand", category: "sans-serif", weights: ["300", "400", "500", "600", "700"] },
  { family: "Comfortaa", category: "display", weights: ["300", "400", "500", "600", "700"] },
  { family: "Righteous", category: "display", weights: ["400"] },
  { family: "Satisfy", category: "handwriting", weights: ["400"] },
  { family: "Cookie", category: "handwriting", weights: ["400"] },
  { family: "Tangerine", category: "handwriting", weights: ["400", "700"] },
  { family: "Yellowtail", category: "handwriting", weights: ["400"] },
  { family: "Alex Brush", category: "handwriting", weights: ["400"] },
  { family: "Allura", category: "handwriting", weights: ["400"] },
  { family: "Parisienne", category: "handwriting", weights: ["400"] },
  { family: "Vollkorn", category: "serif", weights: ["400", "500", "600", "700", "800", "900"] },
  { family: "Crimson Text", category: "serif", weights: ["400", "600", "700"] },
  { family: "Libre Baskerville", category: "serif", weights: ["400", "500", "700"] },
  { family: "Cardo", category: "serif", weights: ["400", "700"] },
]

export const SYSTEM_FONTS: GoogleFont[] = [
  { family: "system-ui", category: "system", weights: ["400", "700"] },
  { family: "Georgia", category: "system", weights: ["400", "700"] },
  { family: "Times New Roman", category: "system", weights: ["400", "700"] },
  { family: "Arial", category: "system", weights: ["400", "700"] },
  { family: "Helvetica", category: "system", weights: ["400", "700"] },
  { family: "Courier New", category: "system", weights: ["400", "700"] },
  { family: "Verdana", category: "system", weights: ["400", "700"] },
  { family: "Tahoma", category: "system", weights: ["400", "700"] },
  { family: "Trebuchet MS", category: "system", weights: ["400", "700"] },
]

// Custom (uploaded) fonts live as a data URL in the persisted store, but their
// @font-face rule only exists in the DOM. These helpers rebuild that rule so it
// can be injected on upload and re-injected on every app load.

// Stable <style> id for a custom font, derived from its name.
export function fontFaceStyleId(name: string): string {
  return `font-face-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`
}

// Map a data URL's MIME type to a CSS @font-face format() hint.
// Returns undefined when unknown (e.g. application/octet-stream); the browser
// then sniffs the format, which still loads the font.
export function fontFormatFromDataUrl(dataUrl: string): string | undefined {
  const mime = /^data:([^;,]+)[;,]/.exec(dataUrl)?.[1]?.toLowerCase()
  switch (mime) {
    case "font/ttf":
    case "font/truetype":
    case "application/x-font-ttf":
      return "truetype"
    case "font/otf":
    case "font/opentype":
    case "application/x-font-otf":
      return "opentype"
    case "font/woff2":
      return "woff2"
    case "font/woff":
      return "woff"
    default:
      return undefined
  }
}

// Build a CSS @font-face rule for a custom font backed by a data URL.
// `family` is the CSS font-family value (already quoted, e.g. "'My Font'").
// The url is quoted to keep long base64 data URLs robust across browsers.
export function buildFontFaceRule(family: string, dataUrl: string): string {
  const fmt = fontFormatFromDataUrl(dataUrl)
  const src = fmt ? `url("${dataUrl}") format('${fmt}')` : `url("${dataUrl}")`
  return `@font-face { font-family: ${family}; src: ${src}; font-display: swap; }`
}

// Build the Google Fonts CSS URL for a given font family and weights
export function buildGoogleFontUrl(family: string, weights: string[] = ["400", "700"]): string {
  const familyParam = family.replace(/ /g, "+")
  const weightsParam = weights.length > 1 ? `:wght@${weights.join(";")}` : ""
  return `https://fonts.googleapis.com/css2?family=${familyParam}${weightsParam}&display=swap`
}

// Generic CSS fallback for each system font in the catalog.
const SYSTEM_FONT_FALLBACKS: Record<string, string> = {
  Georgia: "serif",
  "Times New Roman": "serif",
  Arial: "sans-serif",
  Helvetica: "sans-serif",
  "Courier New": "monospace",
  Verdana: "sans-serif",
  Tahoma: "sans-serif",
  "Trebuchet MS": "sans-serif",
}

// Build the CSS font-family value for a system font: quoted when the name has
// spaces, followed by its generic fallback. "system-ui" is already generic.
export function buildSystemFontFamily(name: string): string {
  if (name === "system-ui") return "system-ui"
  const quoted = name.includes(" ") ? `'${name}'` : name
  return `${quoted}, ${SYSTEM_FONT_FALLBACKS[name] ?? "sans-serif"}`
}
