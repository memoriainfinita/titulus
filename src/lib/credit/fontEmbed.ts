// Pre-fetch and embed Google Fonts as data URLs so they work in the captured image
// without CORS issues. Returns a CSS string with @font-face rules ready to embed.
export async function buildEmbeddedFontsCSS(): Promise<string> {
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
