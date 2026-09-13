import { FontUsage, ParsedFontFace, parseFontFaces, selectFontFaces } from "@/lib/credit/fontSubset"

// Per-export font embedding shared by both engines. prepare() once, then
// cssFor(stage) per frame: the @font-face subset that frame renders, or null
// when there is nothing to embed (html-to-image then collects fonts itself).
export function createFrameFontEmbedder() {
  let faces: ParsedFontFace[] | null = null
  const subset = memoFontSubset()
  return {
    async prepare(): Promise<void> {
      const css = (await buildEmbeddedFontsCSS()) + customFontFacesCSS()
      faces = css.trim() ? parseFontFaces(css) : null
    },
    cssFor(root: HTMLElement): string | null {
      return faces ? subset(faces, root) : null
    },
  }
}

// Pre-fetch and embed Google Fonts as data URLs so they work in the captured image
// without CORS issues. Returns a CSS string with @font-face rules ready to embed.
async function buildEmbeddedFontsCSS(): Promise<string> {
  try {
    // Find all Google Fonts <link> tags in the document
    const fontLinks = Array.from(
      document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]'),
    ) as HTMLLinkElement[]

    if (fontLinks.length === 0) return ""

    let css = ""
    for (const link of fontLinks) {
      try {
        const response = await fetch(link.href)
        const text = await response.text()
        // The CSS contains @font-face rules with relative URL references to fonts.gstatic.com
        // We need to download each .woff2 file and convert to data URL
        const fontUrlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g
        let match
        let processedCss = text
        const replacements: Array<{ url: string; dataUrl: string }> = []

        while ((match = fontUrlRegex.exec(text)) !== null) {
          const fontUrl = match[1]
          try {
            const fontResp = await fetch(fontUrl)
            const fontBlob = await fontResp.blob()
            const reader = new FileReader()
            const dataUrl = await new Promise<string>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(fontBlob)
            })
            replacements.push({ url: fontUrl, dataUrl })
          } catch {
            // Skip this font, will fall back
          }
        }

        for (const { url, dataUrl } of replacements) {
          processedCss = processedCss.replace(`url(${url})`, `url(${dataUrl})`)
        }
        css += "\n" + processedCss
      } catch {
        // Skip this stylesheet
      }
    }
    return css
  } catch (err) {
    console.warn("Failed to build embedded fonts CSS", err)
    return ""
  }
}

// Uploaded fonts: FontLoader injects their @font-face (data URL) as
// <style id="font-face-..."> (see fontFaceStyleId). With skipFonts they would be
// dropped from the capture, so they join the embeddable pool.
function customFontFacesCSS(): string {
  return Array.from(document.querySelectorAll<HTMLStyleElement>('style[id^="font-face-"]'))
    .map((el) => "\n" + (el.textContent ?? ""))
    .join("")
}

// Fonts and characters rendered in the stage right now. Read per frame because
// appearing mode mounts different items (and fonts) over time.
function collectFontUsage(root: HTMLElement): { usages: FontUsage[]; codepoints: Set<number> } {
  const faces = new Set<string>()
  const codepoints = new Set<number>()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  for (let node: Node | null = root; node; node = walker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const cs = getComputedStyle(node as Element)
      for (const family of cs.fontFamily.split(",")) faces.add(`${family}|${cs.fontWeight}|${cs.fontStyle}`)
    } else {
      for (const ch of node.textContent ?? "") codepoints.add(ch.codePointAt(0)!)
    }
  }
  const usages = [...faces].map((key) => {
    const [family, weight, style] = key.split("|")
    return { family, weight: Number(weight), style }
  })
  return { usages, codepoints }
}

// Rebuild the subset only when the rendered fonts or characters change, so
// consecutive frames reuse the same CSS string.
function memoFontSubset() {
  let lastKey = ""
  let lastCSS = ""
  return (faces: ParsedFontFace[], root: HTMLElement): string => {
    const { usages, codepoints } = collectFontUsage(root)
    const key =
      usages.map((u) => `${u.family}|${u.weight}|${u.style}`).sort().join(";") +
      "#" +
      [...codepoints].sort((a, b) => a - b).join(",")
    if (key !== lastKey) {
      lastKey = key
      lastCSS = selectFontFaces(faces, usages, codepoints)
    }
    return lastCSS
  }
}
