// Browser-only: reads an image file and re-encodes it as a JPEG data URL no
// larger than maxSide on its long side. Keeps persisted state (localStorage)
// and the per-frame export capture small.

import { fitWithin } from "./background"

export const BACKGROUND_MAX_SIDE = 1920
const JPEG_QUALITY = 0.9

export async function downscaleImageFile(file: File, maxSide = BACKGROUND_MAX_SIDE): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("2D canvas unavailable")
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY)
  } finally {
    bitmap.close()
  }
}
