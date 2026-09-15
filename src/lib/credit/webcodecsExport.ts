"use client"

import { toCanvas } from "html-to-image"
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, Quality, canEncodeVideo } from "mediabunny"
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

export interface WebCodecsExportParams {
  stageElement: HTMLElement
  width: number
  height: number
  pixelRatio: number
  fps: number
  quality: ExportQuality
  duration: number
  // Only this part of the timeline; null = the whole piece.
  range: ExportRange | null
  backgroundColor: string | undefined
  setManualProgress: (p: number) => void
  onProgress: (phase: "rendering" | "finalizing", framesDone: number, totalFrames: number, overall: number) => void
  isCancelled: () => boolean
}

// Checked when the dialog opens, before the user picks a save destination.
export async function canExportWithWebCodecs(width: number, height: number, quality: ExportQuality): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false
  try {
    // No hardwareAcceleration here: any avc encoder (hardware or software) is enough.
    return await canEncodeVideo("avc", {
      width: evenDimension(width),
      height: evenDimension(height),
      quality: new Quality(WEBCODECS_QUALITY[quality]),
    })
  } catch {
    return false
  }
}

// Per frame: deterministic render -> toCanvas -> staging canvas -> hardware H.264.
// Returns null when cancelled.
export async function exportWithWebCodecs(p: WebCodecsExportParams): Promise<Blob | null> {
  const frames = frameWindow(p.duration, p.fps, p.range)
  const totalFrames = frames.count
  const outWidth = evenDimension(p.width * p.pixelRatio)
  const outHeight = evenDimension(p.height * p.pixelRatio)

  // CanvasSource wraps ONE canvas; html-to-image returns a new one per frame.
  const staging = document.createElement("canvas")
  staging.width = outWidth
  staging.height = outHeight
  const ctx = staging.getContext("2d")
  if (!ctx) throw new Error("No se pudo crear el canvas de exportación")

  const quality = new Quality(WEBCODECS_QUALITY[p.quality])
  // Machines without a hardware H.264 encoder reject "prefer-hardware" even
  // though plain avc is supported (software encoder): fall back to no preference.
  const hardwareAcceleration = (await canEncodeVideo("avc", {
    width: outWidth,
    height: outHeight,
    quality,
    hardwareAcceleration: "prefer-hardware",
  }).catch(() => false))
    ? "prefer-hardware"
    : "no-preference"

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  })
  const source = new CanvasSource(staging, {
    codec: "avc",
    quality,
    hardwareAcceleration,
  })
  output.addVideoTrack(source, { frameRate: p.fps })

  try {
    await output.start()
    const fonts = createFrameFontEmbedder()

    for (let i = 0; i < totalFrames; i++) {
      if (p.isCancelled()) {
        await output.cancel()
        return null
      }

      p.setManualProgress(frameProgress(i, frames))
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
      await new Promise((r) => setTimeout(r, 16))
      if (i === 0) await fonts.prepare()

      const frame = await captureFrame(p, fonts.cssFor(p.stageElement))
      // Alpha is dropped by H.264; paint black first like the FFmpeg path did.
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, outWidth, outHeight)
      ctx.drawImage(frame, 0, 0, outWidth, outHeight)

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

async function captureFrame(p: WebCodecsExportParams, fontEmbedCSS: string | null): Promise<HTMLCanvasElement> {
  // Same CORS-noise filter as the FFmpeg path (fonts are embedded via fontEmbedCSS).
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    const msg = args.map((a) => (typeof a === "string" ? a : (a as { message?: string })?.message || "")).join(" ")
    if (
      ["cssRules", "CSSStyleSheet", "Cannot access rules", "Error loading remote stylesheet", "Failed to fetch"].some(
        (s) => msg.includes(s),
      )
    )
      return
    originalConsoleError.apply(console, args as never)
  }
  try {
    return await toCanvas(p.stageElement, {
      width: p.width,
      height: p.height,
      pixelRatio: p.pixelRatio,
      // An empty subset is still "provided": html-to-image checks != null.
      fontEmbedCSS: fontEmbedCSS ?? undefined,
      skipFonts: fontEmbedCSS !== null,
      backgroundColor: p.backgroundColor,
    })
  } finally {
    console.error = originalConsoleError
  }
}
