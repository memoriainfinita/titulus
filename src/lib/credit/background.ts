// Pure builder for the stage background: dim overlay > image > gradient > color.
// Shared by ScrollCredits and AppearingCredits so both modes (and the export,
// which captures the stage) compose the background identically.

import type { CSSProperties } from "react"
import { CreditConfig } from "./types"

interface Layer {
  image: string
  size: string
}

export function resolveBackgroundStyle(config: CreditConfig): CSSProperties {
  const layers: Layer[] = []
  if (config.backgroundImage) {
    const dim = Math.max(0, Math.min(1, config.backgroundImageDim))
    if (dim > 0) {
      const c = `rgba(0, 0, 0, ${dim})`
      layers.push({ image: `linear-gradient(${c}, ${c})`, size: "100% 100%" })
    }
    layers.push({ image: `url("${config.backgroundImage}")`, size: config.backgroundImageFit })
  }
  if (config.useGradient) {
    layers.push({
      image: `linear-gradient(${config.gradientAngle}deg, ${config.gradientFrom}, ${config.gradientTo})`,
      size: "100% 100%",
    })
  }

  if (layers.length === 0) return { backgroundColor: config.backgroundColor }
  if (!config.backgroundImage) return { backgroundImage: layers[0].image }
  return {
    backgroundColor: config.backgroundColor,
    backgroundImage: layers.map((l) => l.image).join(", "),
    backgroundSize: layers.map((l) => l.size).join(", "),
    backgroundPosition: layers.map(() => "center").join(", "),
    backgroundRepeat: layers.map(() => "no-repeat").join(", "),
  }
}

// Dimensions that fit a width×height image within maxSide on its long side.
export function fitWithin(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}
