"use client"

import * as React from "react"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { toBlobURL } from "@ffmpeg/util"
import { toPng } from "html-to-image"
import { CreditConfig, CreditItem, CreditMode } from "@/lib/credit/types"
import { buildEmbeddedFontsCSS } from "@/lib/credit/fontEmbed"
import { exportWithWebCodecs } from "@/lib/credit/webcodecsExport"

export interface ExportOptions {
  // "webcodecs": toCanvas + hardware H.264 (MP4 only). "ffmpeg": PNG frames + FFmpeg-wasm.
  engine: "webcodecs" | "ffmpeg"
  fps: number
  width: number
  height: number
  // Raster scale multiplier applied at capture time (1 = stage resolution).
  // The logical width/height stay the same so text layout is unchanged.
  pixelRatio: number
  format: "mp4" | "webm"
  quality: "fast" | "balanced" | "high"
  // Estimated duration in seconds
  duration: number
}

export interface ExportProgress {
  phase: "idle" | "loading-ffmpeg" | "capturing" | "encoding" | "rendering" | "finalizing" | "done" | "error"
  currentFrame: number
  totalFrames: number
  message: string
  // 0-1
  overallProgress: number
}

const FFMPEG_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"

// Quality presets -> ffmpeg args
const QUALITY_PRESETS: Record<ExportOptions["quality"], { crf: string; preset: string }> = {
  fast: { crf: "28", preset: "ultrafast" },
  balanced: { crf: "23", preset: "veryfast" },
  high: { crf: "18", preset: "medium" },
}

export function useVideoExport() {
  const [isExporting, setIsExporting] = React.useState(false)
  const [progress, setProgress] = React.useState<ExportProgress>({
    phase: "idle",
    currentFrame: 0,
    totalFrames: 0,
    message: "",
    overallProgress: 0,
  })
  const ffmpegRef = React.useRef<FFmpeg | null>(null)
  const cancelRef = React.useRef(false)

  const loadFfmpeg = React.useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current
    const ffmpeg = new FFmpeg()
    ffmpeg.on("log", () => {
      // Suppress ffmpeg logs in production; could enable in development
    })
    ffmpeg.on("progress", ({ progress: p }) => {
      if (p < 0 || p > 1) return
      setProgress((prev) => ({
        ...prev,
        overallProgress: 0.6 + p * 0.35, // capturing is 0-0.6, encoding is 0.6-0.95
        message: `Codificando video... ${(p * 100).toFixed(0)}%`,
      }))
    })
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    })
    ffmpegRef.current = ffmpeg
    return ffmpeg
  }, [])

  const exportVideo = React.useCallback(
    async (
      stageElement: HTMLElement,
      items: CreditItem[],
      config: CreditConfig,
      mode: CreditMode,
      options: ExportOptions,
      // Function to set manual progress on the credits component (0-1)
      setManualProgress: (p: number) => void,
    ): Promise<Blob | null> => {
      cancelRef.current = false
      setIsExporting(true)
      try {
        if (options.engine === "webcodecs") {
          const blob = await exportWithWebCodecs({
            stageElement,
            width: options.width,
            height: options.height,
            pixelRatio: options.pixelRatio,
            fps: options.fps,
            quality: options.quality,
            duration: options.duration,
            backgroundColor: config.useGradient ? undefined : config.backgroundColor,
            setManualProgress,
            isCancelled: () => cancelRef.current,
            onProgress: (phase, framesDone, totalFrames, overall) =>
              setProgress({
                phase,
                currentFrame: framesDone,
                totalFrames,
                message: phase === "rendering" ? `Renderizando frames... ${framesDone}/${totalFrames}` : "Finalizando...",
                overallProgress: overall,
              }),
          })
          if (!blob) {
            setProgress({ phase: "idle", currentFrame: 0, totalFrames: 0, message: "Exportación cancelada", overallProgress: 0 })
            return null
          }
          setProgress({ phase: "done", currentFrame: 0, totalFrames: 0, message: "Video exportado correctamente", overallProgress: 1 })
          return blob
        }

        // 1. Load ffmpeg
        setProgress({
          phase: "loading-ffmpeg",
          currentFrame: 0,
          totalFrames: 0,
          message: "Cargando motor de video (ffmpeg)...",
          overallProgress: 0.02,
        })
        const ffmpeg = await loadFfmpeg()

        const totalFrames = Math.max(1, Math.ceil(options.duration * options.fps))
        const { crf, preset } = QUALITY_PRESETS[options.quality]

        // 2. Capture frames one by one
        setProgress({
          phase: "capturing",
          currentFrame: 0,
          totalFrames,
          message: `Capturando frames... 0/${totalFrames}`,
          overallProgress: 0.05,
        })

        // Cleanup any previous frames in MEMFS
        try {
          const prevFiles = await ffmpeg.listDir("/")
          for (const f of prevFiles) {
            if (f.name.startsWith("frame_") && f.name.endsWith(".png")) {
              try {
                ffmpeg.deleteFile(f.name)
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }

        // Pre-fetch and embed Google Fonts as data URLs to avoid CORS issues during capture
        let fontEmbedCSS = ""

        for (let i = 0; i < totalFrames; i++) {
          if (cancelRef.current) {
            setProgress({
              phase: "idle",
              currentFrame: 0,
              totalFrames: 0,
              message: "Exportación cancelada",
              overallProgress: 0,
            })
            setIsExporting(false)
            return null
          }

          const p = i / (totalFrames - 1 || 1)
          setManualProgress(p)

          // Wait for React to paint (two RAFs ensure layout is committed)
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          })
          // Small extra delay for fonts/images to settle
          await new Promise((r) => setTimeout(r, 16))

          // On first frame, build the embedded fonts CSS to use for all subsequent captures
          if (i === 0 && !fontEmbedCSS) {
            fontEmbedCSS = await buildEmbeddedFontsCSS()
          }

          // Capture frame as PNG
          // Suppress CORS errors from html-to-image trying to read Google Fonts CSS rules
          // (we handle font embedding ourselves via fontEmbedCSS)
          const originalConsoleError = console.error
          console.error = function (...args: unknown[]) {
            const msg = args.map(a => (typeof a === "string" ? a : (a as { message?: string })?.message || "")).join(" ")
            if (
              msg.includes("cssRules") ||
              msg.includes("CSSStyleSheet") ||
              msg.includes("Cannot access rules") ||
              msg.includes("Error loading remote stylesheet") ||
              msg.includes("Failed to fetch")
            ) {
              return // suppress known html-to-image CORS noise
            }
            originalConsoleError.apply(console, args as never)
          }
          let dataUrl: string
          try {
            dataUrl = await toPng(stageElement, {
              width: options.width,
              height: options.height,
              cacheBust: true,
              pixelRatio: options.pixelRatio,
              // Provide embedded fonts CSS to avoid CORS issues with Google Fonts CDN.
              // When provided, html-to-image skips its own (CORS-blocked) font collection.
              fontEmbedCSS: fontEmbedCSS || undefined,
              skipFonts: !!fontEmbedCSS,
              backgroundColor: config.useGradient
                ? undefined
                : config.backgroundColor,
            })
          } catch (err) {
            originalConsoleError.call(console, "Frame capture failed", err)
            throw new Error(`No se pudo capturar el frame ${i}`)
          } finally {
            console.error = originalConsoleError
          }

          // Convert to Uint8Array
          const response = await fetch(dataUrl)
          const arrayBuffer = await response.arrayBuffer()
          const frameName = `frame_${String(i).padStart(5, "0")}.png`
          await ffmpeg.writeFile(frameName, new Uint8Array(arrayBuffer))

          const captureProgress = (i + 1) / totalFrames
          setProgress({
            phase: "capturing",
            currentFrame: i + 1,
            totalFrames,
            message: `Capturando frames... ${i + 1}/${totalFrames}`,
            overallProgress: 0.05 + captureProgress * 0.55,
          })

          // Yield to UI thread so the progress bar updates
          await new Promise((r) => setTimeout(r, 0))
        }

        // 3. Encode
        setProgress({
          phase: "encoding",
          currentFrame: totalFrames,
          totalFrames,
          message: "Codificando video MP4...",
          overallProgress: 0.6,
        })

        const outputFile = options.format === "mp4" ? "output.mp4" : "output.webm"
        const codec = options.format === "mp4" ? "libx264" : "libvpx-vp9"
        const pixFmt = options.format === "mp4" ? "-pix_fmt" : "-b:v"
        const pixVal = options.format === "mp4" ? "yuv420p" : "1M"

        const args =
          options.format === "mp4"
            ? [
                "-framerate",
                String(options.fps),
                "-i",
                "frame_%05d.png",
                "-c:v",
                codec,
                // Force even dimensions (required by yuv420p / H.264) in case the
                // scale multiplier produced an odd width or height.
                "-vf",
                "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                pixFmt,
                pixVal,
                "-preset",
                preset,
                "-crf",
                crf,
                "-movflags",
                "+faststart",
                outputFile,
              ]
            : [
                "-framerate",
                String(options.fps),
                "-i",
                "frame_%05d.png",
                "-c:v",
                codec,
                pixFmt,
                pixVal,
                outputFile,
              ]

        await ffmpeg.exec(args)

        // 4. Read and return
        setProgress({
          phase: "finalizing",
          currentFrame: totalFrames,
          totalFrames,
          message: "Finalizando...",
          overallProgress: 0.97,
        })

        const data = await ffmpeg.readFile(outputFile)
        const mime = options.format === "mp4" ? "video/mp4" : "video/webm"
        const blob = new Blob([data as BlobPart], { type: mime })

        // Cleanup MEMFS to free memory
        try {
          for (let i = 0; i < totalFrames; i++) {
            const frameName = `frame_${String(i).padStart(5, "0")}.png`
            ffmpeg.deleteFile(frameName)
          }
          ffmpeg.deleteFile(outputFile)
        } catch {
          // ignore
        }

        setProgress({
          phase: "done",
          currentFrame: totalFrames,
          totalFrames,
          message: "Video exportado correctamente",
          overallProgress: 1,
        })

        return blob
      } catch (err) {
        // Cancelling during encoding terminates the ffmpeg worker, which makes
        // the pending exec/readFile reject: report a cancel, not an error.
        if (cancelRef.current) {
          setProgress({
            phase: "idle",
            currentFrame: 0,
            totalFrames: 0,
            message: "Exportación cancelada",
            overallProgress: 0,
          })
          return null
        }
        console.error("Export failed", err)
        setProgress({
          phase: "error",
          currentFrame: 0,
          totalFrames: 0,
          message: err instanceof Error ? err.message : "Error desconocido en la exportación",
          overallProgress: 0,
        })
        return null
      } finally {
        setIsExporting(false)
      }
    },
    [loadFfmpeg],
  )

  const cancelExport = React.useCallback(() => {
    cancelRef.current = true
    // During ffmpeg.exec the capture-loop check never runs, so kill the worker
    // to abort the encode. A terminated instance can't be reused: drop it and
    // let the next export load a fresh one.
    ffmpegRef.current?.terminate()
    ffmpegRef.current = null
  }, [])

  const reset = React.useCallback(() => {
    setProgress({
      phase: "idle",
      currentFrame: 0,
      totalFrames: 0,
      message: "",
      overallProgress: 0,
    })
  }, [])

  return { isExporting, progress, exportVideo, cancelExport, reset }
}
