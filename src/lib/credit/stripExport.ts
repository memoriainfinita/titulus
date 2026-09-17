"use client"

// Experimental scroll-mode engine: captures the credits block a few times (in
// chunks) and composes every frame on a canvas, instead of capturing the whole
// stage DOM per frame. Scroll mode and MP4 only.

import { toCanvas } from "html-to-image"
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeVideo } from "mediabunny"
import { CreditConfig, CreditItem } from "@/lib/credit/types"
import { createFrameFontEmbedder } from "@/lib/credit/fontEmbed"
import {
  ExportQuality,
  WEBCODECS_QUALITY,
  evenDimension,
  ExportRange,
  frameProgress,
  frameTiming,
  frameWindow,
  renderingProgress,
} from "@/lib/credit/exportSettings"
import { getScrollDurationSec, getScrollTranslateY } from "@/lib/credit/scroll"
import { resolveOverlay, overlayStartSec, overlayOpacityAt } from "@/lib/credit/overlay"
import { resolveImageWidth } from "@/lib/credit/image"
import { resolveSafeInset } from "@/lib/credit/safeMargins"

// Chunk height in CSS px (canvas size limits).
const CHUNK_HEIGHT = 4096

export interface StripExportParams {
  // Hidden export stage; the scroll content block is found inside it.
  stageElement: HTMLElement
  items: CreditItem[]
  config: CreditConfig
  pixelRatio: number
  fps: number
  quality: ExportQuality
  duration: number
  // Only this part of the timeline; null = the whole piece.
  range: ExportRange | null
  // Set to null so the export stage renders the full, non-windowed content.
  setManualProgress: (p: number | null) => void
  onProgress: (phase: "rendering" | "finalizing", framesDone: number, totalFrames: number, overall: number) => void
  isCancelled: () => boolean
}

// Returns null when cancelled.
export async function exportScrollStrip(p: StripExportParams): Promise<Blob | null> {
  const { config, items } = p
  p.setManualProgress(null)
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))

  const el = p.stageElement.querySelector<HTMLElement>("[data-scroll-content]")
  if (!el) throw new Error("No se encontró el bloque de créditos del escenario")
  if (el.children.length !== items.length) throw new Error("El escenario de exportación está recortado o desincronizado")

  const W = config.stageWidth
  const H = config.stageHeight
  const pr = p.pixelRatio
  const outW = evenDimension(W * pr)
  const outH = evenDimension(H * pr)
  const frames = frameWindow(p.duration, p.fps, p.range)
  const totalFrames = frames.count

  const contentH = el.scrollHeight
  const contentW = el.offsetWidth
  const scrollSec = getScrollDurationSec(contentH, H, config.scrollSpeed)
  const contentX = Math.round(resolveSafeInset(config) * W * pr)

  // Static layers, drawn once.
  const bg = await renderBackground(config, outW, outH)
  const vignette = renderVignette(config, outW, outH)

  // Overlays: position is fixed, only opacity changes per frame.
  const overlays = await Promise.all(
    items.flatMap((item, i) => {
      if (item.type !== "overlay" || !item.imageSrc) return []
      const o = resolveOverlay(item)
      const markerTop = (el.children[i] as HTMLElement).offsetTop
      return [
        loadImage(item.imageSrc).then((img) => {
          const w = (resolveImageWidth(item, config) / 100) * W * pr
          const h = (w * img.naturalHeight) / img.naturalWidth
          return {
            img, layer: o.layer, w, h,
            x: (o.x / 100) * W * pr - w / 2,
            y: (o.y / 100) * H * pr - h / 2,
            start: overlayStartSec(markerTop, contentH, H, config.scrollDirection, scrollSec),
            duration: o.duration,
            fade: o.fade,
          }
        }),
      ]
    }),
  )

  // Chunks of the credits block, captured lazily and evicted once off stage.
  const fonts = createFrameFontEmbedder()
  await fonts.prepare()
  const fontCSS = fonts.cssFor(el)
  const chunkCount = Math.max(1, Math.ceil(contentH / CHUNK_HEIGHT))
  const chunks = new Map<number, HTMLCanvasElement>()
  const getChunk = async (k: number) => {
    const cached = chunks.get(k)
    if (cached) return cached
    const canvas = await toCanvas(el, {
      width: contentW,
      height: Math.min(CHUNK_HEIGHT, contentH - k * CHUNK_HEIGHT),
      pixelRatio: pr,
      fontEmbedCSS: fontCSS ?? undefined,
      skipFonts: fontCSS !== null,
      // Static: html-to-image ignores `left` on the absolute clone, so the safe inset would be captured twice.
      style: { position: "static", transform: `translate3d(0, ${-k * CHUNK_HEIGHT}px, 0)` },
    })
    chunks.set(k, canvas)
    return canvas
  }

  const staging = document.createElement("canvas")
  staging.width = outW
  staging.height = outH
  const ctx = staging.getContext("2d")
  if (!ctx) throw new Error("No se pudo crear el canvas de exportación")

  const quality = new Quality(WEBCODECS_QUALITY[p.quality])
  const hardwareAcceleration = (await canEncodeVideo("avc", {
    width: outW, height: outH, quality, hardwareAcceleration: "prefer-hardware",
  }).catch(() => false))
    ? "prefer-hardware"
    : "no-preference"
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() })
  const source = new CanvasSource(staging, { codec: "avc", quality, hardwareAcceleration })
  output.addVideoTrack(source, { frameRate: p.fps })

  try {
    await output.start()
    for (let i = 0; i < totalFrames; i++) {
      if (p.isCancelled()) {
        await output.cancel()
        return null
      }
      const progress = frameProgress(i, frames)
      const tSec = progress * scrollSec
      // Content top on stage, rounded to an output pixel.
      const yDev = Math.round(getScrollTranslateY(contentH, H, config.scrollDirection, progress) * pr)

      const visible: number[] = []
      for (let k = 0; k < chunkCount; k++) {
        const top = yDev + Math.round(k * CHUNK_HEIGHT * pr)
        const bottom = yDev + Math.round(Math.min((k + 1) * CHUNK_HEIGHT, contentH) * pr)
        if (bottom > 0 && top < outH) visible.push(k)
      }
      for (const k of chunks.keys()) if (!visible.includes(k)) chunks.delete(k)
      const drawn = await Promise.all(visible.map(async (k) => [k, await getChunk(k)] as const))

      ctx.globalAlpha = 1
      ctx.drawImage(bg, 0, 0)
      drawOverlays(ctx, overlays, "back", tSec)
      for (const [k, canvas] of drawn) ctx.drawImage(canvas, contentX, yDev + Math.round(k * CHUNK_HEIGHT * pr))
      if (vignette) ctx.drawImage(vignette, 0, 0)
      drawOverlays(ctx, overlays, "front", tSec)

      const { timestamp, duration } = frameTiming(i, p.fps)
      await source.add(timestamp, duration) // backpressure: must be awaited

      p.onProgress("rendering", i + 1, totalFrames, renderingProgress(i + 1, totalFrames))
    }

    if (p.isCancelled()) {
      await output.cancel()
      return null
    }
    p.onProgress("finalizing", totalFrames, totalFrames, 0.97)
    await output.finalize()

    const buffer = output.target.buffer
    if (!buffer) throw new Error("El codificador no devolvió datos")
    return new Blob([buffer], { type: "video/mp4" })
  } catch (err) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel().catch(() => {})
    throw err
  }
}

type PlacedOverlay = {
  img: HTMLImageElement; layer: "front" | "back"; x: number; y: number; w: number; h: number
  start: number; duration: number; fade: number
}

function drawOverlays(ctx: CanvasRenderingContext2D, overlays: PlacedOverlay[], layer: "front" | "back", tSec: number) {
  for (const o of overlays) {
    if (o.layer !== layer) continue
    const opacity = overlayOpacityAt(tSec, o.start, o.duration, o.fade)
    if (opacity <= 0) continue
    ctx.globalAlpha = opacity
    ctx.drawImage(o.img, o.x, o.y, o.w, o.h)
  }
  ctx.globalAlpha = 1
}

// Mirrors resolveBackgroundStyle: color > gradient > image (cover/contain) > dim.
async function renderBackground(config: CreditConfig, w: number, h: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, w, h)
  if (!config.useGradient || config.backgroundImage) {
    ctx.fillStyle = config.backgroundColor
    ctx.fillRect(0, 0, w, h)
  }
  if (config.useGradient) {
    ctx.fillStyle = cssLinearGradient(ctx, w, h, config.gradientAngle, config.gradientFrom, config.gradientTo)
    ctx.fillRect(0, 0, w, h)
  }
  if (config.backgroundImage) {
    const img = await loadImage(config.backgroundImage)
    const s =
      config.backgroundImageFit === "contain"
        ? Math.min(w / img.naturalWidth, h / img.naturalHeight)
        : Math.max(w / img.naturalWidth, h / img.naturalHeight)
    const iw = img.naturalWidth * s
    const ih = img.naturalHeight * s
    ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih)
    const dim = Math.max(0, Math.min(1, config.backgroundImageDim))
    if (dim > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${dim})`
      ctx.fillRect(0, 0, w, h)
    }
  }
  return canvas
}

// Mirrors the two vignette divs of ScrollCredits.
function renderVignette(config: CreditConfig, w: number, h: number): HTMLCanvasElement | null {
  if (!config.vignetteEnabled) return null
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")!
  const vh = (config.vignetteHeight / 100) * h
  const top = config.useGradient ? config.gradientFrom : config.backgroundColor
  const bottom = config.useGradient ? config.gradientTo : config.backgroundColor
  // CSS interpolates to "transparent" premultiplied: same color at alpha 0.
  const gTop = ctx.createLinearGradient(0, 0, 0, vh)
  gTop.addColorStop(0, top)
  gTop.addColorStop(1, withAlpha(ctx, top, 0))
  ctx.fillStyle = gTop
  ctx.fillRect(0, 0, w, vh)
  const gBottom = ctx.createLinearGradient(0, h, 0, h - vh)
  gBottom.addColorStop(0, bottom)
  gBottom.addColorStop(1, withAlpha(ctx, bottom, 0))
  ctx.fillStyle = gBottom
  ctx.fillRect(0, h - vh, w, vh)
  return canvas
}

// CSS linear-gradient(<deg>) geometry: 0deg points up, gradient line spans the box.
function cssLinearGradient(ctx: CanvasRenderingContext2D, w: number, h: number, deg: number, from: string, to: string) {
  const a = (deg * Math.PI) / 180
  const half = (Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))) / 2
  const dx = Math.sin(a) * half
  const dy = -Math.cos(a) * half
  const g = ctx.createLinearGradient(w / 2 - dx, h / 2 - dy, w / 2 + dx, h / 2 + dy)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  return g
}

function withAlpha(ctx: CanvasRenderingContext2D, color: string, alpha: number): string {
  ctx.fillStyle = color
  const c = String(ctx.fillStyle)
  if (c.startsWith("#")) {
    const n = parseInt(c.slice(1), 16)
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
  }
  return c.replace(/rgba?\(([^,]+),([^,]+),([^,)]+).*\)/, `rgba($1,$2,$3, ${alpha})`)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  return img.decode().then(() => img)
}
