"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { RadioGroup } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Film,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Settings2,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { useShallow } from "zustand/react/shallow"
import { useVideoExport, ExportProgress } from "@/lib/credit/useVideoExport"
import { formatElapsed, estimateRemainingSeconds } from "@/lib/credit/exportTiming"
import { canExportWithWebCodecs } from "@/lib/credit/webcodecsExport"
import { ExportRange, frameWindow } from "@/lib/credit/exportSettings"
import { toast } from "sonner"

// File System Access API — not yet in the TS DOM lib in all setups.
type SaveFilePicker = (opts?: {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}) => Promise<FileSystemFileHandle>

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Stage element ref to capture from (the hidden export stage)
  stageRef: React.RefObject<HTMLDivElement | null>
  // Function to set manual progress on the export-stage credits component
  setManualProgress: (p: number | null) => void
  // Measured duration in seconds
  duration: number
  // In/out range marked on the timeline; null = none marked
  range: ExportRange | null
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "0s"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

// Whole card is the radio button (no separate radio dot to aim at).
function OptionButton({
  value,
  id,
  title,
  hint,
  disabled,
}: {
  value: string
  id: string
  title: string
  hint?: string
  disabled?: boolean
}) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      id={id}
      disabled={disabled}
      className="border rounded-md p-2.5 text-left transition-colors cursor-pointer hover:bg-accent/40 data-[state=checked]:border-primary data-[state=checked]:bg-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </RadioGroupPrimitive.Item>
  )
}

function PhaseIcon({ phase }: { phase: ExportProgress["phase"] }) {
  switch (phase) {
    case "loading-ffmpeg":
    case "capturing":
    case "encoding":
    case "rendering":
    case "finalizing":
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />
    case "done":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
    case "error":
      return <XCircle className="h-5 w-5 text-destructive" />
    default:
      return <Film className="h-5 w-5 text-muted-foreground" />
  }
}

export function ExportDialog({
  open,
  onOpenChange,
  stageRef,
  setManualProgress,
  duration,
  range,
}: ExportDialogProps) {
  const { items, config, projectName } = useCreditStore(
    useShallow((s) => ({ items: s.items, config: s.config, projectName: s.projectName })),
  )
  const { isExporting, progress, exportVideo, cancelExport, reset } = useVideoExport()
  const [fps, setFps] = React.useState(30)
  const [scale, setScale] = React.useState(1)
  const [quality, setQuality] = React.useState<"fast" | "balanced" | "high">("balanced")
  const [format, setFormat] = React.useState<"mp4" | "webm">("mp4")
  const [onlyRange, setOnlyRange] = React.useState(true)
  const [engine, setEngine] = React.useState<"webcodecs" | "ffmpeg" | "strip">("webcodecs")
  // null while the encoder support check is pending
  const [webcodecsSupported, setWebcodecsSupported] = React.useState<boolean | null>(null)
  const [resultBlob, setResultBlob] = React.useState<Blob | null>(null)
  const [elapsedMs, setElapsedMs] = React.useState(0)
  const [savedToFile, setSavedToFile] = React.useState(false)
  const startTimeRef = React.useRef<number | null>(null)
  const phaseStartRef = React.useRef<number | null>(null)
  const fileHandleRef = React.useRef<FileSystemFileHandle | null>(null)

  // Reset on close
  React.useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        reset()
        setResultBlob(null)
        setElapsedMs(0)
        setSavedToFile(false)
        startTimeRef.current = null
        phaseStartRef.current = null
        fileHandleRef.current = null
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [open, reset])

  // Live elapsed timer while exporting
  React.useEffect(() => {
    if (!isExporting) return
    const id = setInterval(() => {
      if (startTimeRef.current != null) {
        setElapsedMs(performance.now() - startTimeRef.current)
      }
    }, 250)
    return () => clearInterval(id)
  }, [isExporting])

  // Mark when each phase begins, so the ETA extrapolates within the current
  // phase (capturing and encoding run at very different rates, and the first
  // export spends a chunk of time downloading ffmpeg).
  React.useEffect(() => {
    phaseStartRef.current = performance.now()
  }, [progress.phase])

  const effectiveRange = range && onlyRange ? range : null
  const totalFrames = frameWindow(duration, fps, effectiveRange).count
  const exportDuration = effectiveRange ? totalFrames / fps : duration
  const evenDim = (n: number) => Math.round(n / 2) * 2
  const outWidth = evenDim(config.stageWidth * scale)
  const outHeight = evenDim(config.stageHeight * scale)
  const SCALE_PRESETS = [1, 1.5, 2, 3]

  // Check H.264 encoder support when the dialog opens (and when the target
  // changes), so an unsupported browser never reaches the save picker.
  React.useEffect(() => {
    if (!open) return
    let alive = true
    canExportWithWebCodecs(outWidth, outHeight, quality).then((ok) => {
      if (alive) setWebcodecsSupported(ok)
    })
    return () => {
      alive = false
    }
  }, [open, outWidth, outHeight, quality])

  const webcodecsAvailable = webcodecsSupported === true && format === "mp4"
  const stripAvailable = webcodecsAvailable && config.mode === "scroll"
  const effectiveEngine =
    engine === "strip" && stripAvailable
      ? "strip"
      : engine !== "ffmpeg" && webcodecsAvailable
      ? "webcodecs"
      : "ffmpeg"

  // Real encoder settings behind each quality level (see useVideoExport / WEBCODECS_QUALITY).
  const qualityHint: Record<"fast" | "balanced" | "high", string> =
    format === "webm"
      ? { fast: "No aplica (1 Mbps fijo)", balanced: "No aplica (1 Mbps fijo)", high: "No aplica (1 Mbps fijo)" }
      : effectiveEngine === "ffmpeg"
      ? { fast: "CRF 28 · ultrafast", balanced: "CRF 23 · veryfast", high: "CRF 18 · medium" }
      : { fast: "Bitrate medium", balanced: "Bitrate high", high: "Bitrate very-high" }

  // Per-phase ETA: capturing is linear in frames; encoding maps to the 0.6-0.95
  // slice of the overall bar reported by ffmpeg. Reading the ref and the clock
  // during render is intentional: the dialog re-renders every second via the
  // elapsed-time interval, so the ETA refreshes with it.
  // eslint-disable-next-line react-hooks/refs, react-hooks/purity -- ver comentario
  const phaseElapsedMs = phaseStartRef.current != null ? performance.now() - phaseStartRef.current : 0
  let etaSeconds: number | null = null
  if ((progress.phase === "capturing" || progress.phase === "rendering") && progress.totalFrames > 0) {
    etaSeconds = estimateRemainingSeconds(phaseElapsedMs, progress.currentFrame / progress.totalFrames)
  } else if (progress.phase === "encoding") {
    etaSeconds = estimateRemainingSeconds(phaseElapsedMs, (progress.overallProgress - 0.6) / 0.35)
  }

  const handleExport = async () => {
    if (!stageRef.current) {
      toast.error("No se encontró el escenario de exportación")
      return
    }

    const safeName = projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "creditos"
    const fileName = `${safeName}.${format}`

    // Choose the save destination up-front, while we still have the user gesture.
    // (showSaveFilePicker must be called from a user activation, not after the
    // long encode finishes.) Falls back to an automatic download when the API
    // is unavailable.
    fileHandleRef.current = null
    const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
    if (picker) {
      try {
        fileHandleRef.current = await picker({
          suggestedName: fileName,
          types: [
            {
              description: format === "mp4" ? "Video MP4" : "Video WebM",
              accept: { [format === "mp4" ? "video/mp4" : "video/webm"]: [`.${format}`] },
            },
          ],
        })
      } catch (err) {
        // User dismissed the picker -> abort the export silently.
        if (err instanceof DOMException && err.name === "AbortError") return
        // Any other failure -> fall back to auto-download.
        fileHandleRef.current = null
      }
    }

    setResultBlob(null)
    setSavedToFile(false)
    setElapsedMs(0)
    startTimeRef.current = performance.now()
    try {
      const blob = await exportVideo(
        stageRef.current,
        items,
        config,
        config.mode,
        {
          engine: effectiveEngine,
          fps,
          width: config.stageWidth,
          height: config.stageHeight,
          pixelRatio: scale,
          format,
          quality,
          duration,
          range: effectiveRange,
        },
        setManualProgress,
      )
      if (blob) {
        setResultBlob(blob)
        const handle = fileHandleRef.current
        if (handle) {
          try {
            const writable = await handle.createWritable()
            await writable.write(blob)
            await writable.close()
            setSavedToFile(true)
            toast.success(`Guardado: ${handle.name} (${formatBytes(blob.size)})`)
          } catch (err) {
            console.error("[export-dialog] Save to file failed, falling back to download:", err)
            triggerDownload(blob, fileName)
            toast.success(`Video exportado (${formatBytes(blob.size)})`)
          }
        } else {
          triggerDownload(blob, fileName)
          toast.success(`Video exportado (${formatBytes(blob.size)})`)
        }
      }
    } catch (err) {
      console.error("[export-dialog] Export error:", err)
      toast.error("Error en la exportación: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      if (startTimeRef.current != null) {
        setElapsedMs(performance.now() - startTimeRef.current)
      }
    }
  }

  const handleCancel = () => {
    cancelExport()
    toast.info("Exportación cancelada")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        aria-describedby={undefined}
        onPointerDownOutside={(e) => {
          // Prevent closing while exporting
          if (isExporting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isExporting) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (isExporting) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Exportar video
          </DialogTitle>
          <DialogDescription>
            Genera un archivo de vídeo con tus créditos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video info summary */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-muted/40 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Duración
              </div>
              <div className="font-medium">{formatDuration(exportDuration)}</div>
            </div>
            <div className="bg-muted/40 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Settings2 className="h-3 w-3" /> Resolución
              </div>
              <div className="font-medium">
                {outWidth}×{outHeight}
              </div>
            </div>
            <div className="bg-muted/40 rounded-md p-2.5">
              <div className="text-xs text-muted-foreground mb-0.5">Frames totales</div>
              <div className="font-medium">{totalFrames.toLocaleString()}</div>
            </div>
          </div>

          {/* Settings */}
          {!isExporting && progress.phase !== "done" && progress.phase !== "error" && (
            <>
              {range && (
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <Label htmlFor="only-range" className="text-sm font-normal cursor-pointer">
                    Solo el tramo marcado ({formatElapsed(range.start * duration * 1000)} – {formatElapsed(range.end * duration * 1000)})
                  </Label>
                  <Switch id="only-range" checked={onlyRange} onCheckedChange={setOnlyRange} />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Motor</Label>
                <RadioGroup
                  value={effectiveEngine}
                  onValueChange={(v) => setEngine(v as "webcodecs" | "ffmpeg" | "strip")}
                  className="grid grid-cols-3 gap-2"
                >
                  <OptionButton
                    value="webcodecs"
                    id="eng-webcodecs"
                    disabled={!webcodecsAvailable}
                    title="WebCodecs"
                    hint={
                      webcodecsSupported === null
                        ? "Comprobando..."
                        : !webcodecsSupported
                        ? "No disponible en este navegador"
                        : format !== "mp4"
                        ? "Solo MP4"
                        : "Captura el escenario en cada frame · H.264 (hardware si hay) · MP4"
                    }
                  />
                  <OptionButton value="ffmpeg" id="eng-ffmpeg" title="FFmpeg" hint="Captura un PNG por frame · codifica por software (descarga ~30 MB) · MP4 o WebM" />
                  <OptionButton
                    value="strip"
                    id="eng-strip"
                    disabled={!stripAvailable}
                    title="Captura única"
                    hint={
                      webcodecsSupported === null
                        ? "Comprobando..."
                        : config.mode !== "scroll"
                        ? "Solo modo scroll"
                        : format !== "mp4"
                        ? "Solo MP4"
                        : !webcodecsSupported
                        ? "No disponible en este navegador"
                        : "Captura el scroll una vez y lo desplaza · H.264 (hardware si hay) · solo scroll y MP4"
                    }
                  />
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Formato</Label>
                <RadioGroup
                  value={format}
                  onValueChange={(v) => setFormat(v as "mp4" | "webm")}
                  className="grid grid-cols-2 gap-2"
                >
                  <OptionButton value="mp4" id="fmt-mp4" title="MP4 (H.264)" hint="H.264 yuv420p · reproduce en cualquier sitio" />
                  <OptionButton value="webm" id="fmt-webm" title="WebM (VP9)" hint="VP9 a 1 Mbps fijos · solo motor FFmpeg" />
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">FPS (frames por segundo)</Label>
                <RadioGroup
                  value={String(fps)}
                  onValueChange={(v) => setFps(Number(v))}
                  className="grid grid-cols-3 gap-2"
                >
                  {[24, 30, 60].map((f) => (
                    <OptionButton key={f} value={String(f)} id={`fps-${f}`} title={`${f} fps`} hint={`${frameWindow(duration, f, effectiveRange).count.toLocaleString()} frames`} />
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Resolución</Label>
                <RadioGroup
                  value={String(scale)}
                  onValueChange={(v) => setScale(Number(v))}
                  className="grid grid-cols-4 gap-2"
                >
                  {SCALE_PRESETS.map((s) => (
                    <OptionButton
                      key={s}
                      value={String(s)}
                      id={`scale-${s}`}
                      title={`×${s}`}
                      hint={`${evenDim(config.stageWidth * s)}×${evenDim(config.stageHeight * s)}`}
                    />
                  ))}
                </RadioGroup>
                {scale > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    Más resolución = exportación más lenta (≈ ×{(scale * scale).toFixed(scale === 1.5 ? 2 : 0)} de píxeles).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Calidad</Label>
                <RadioGroup
                  value={quality}
                  onValueChange={(v) => setQuality(v as "fast" | "balanced" | "high")}
                  className="grid grid-cols-3 gap-2"
                >
                  <OptionButton value="fast" id="q-fast" title="Rápida" hint={qualityHint.fast} />
                  <OptionButton value="balanced" id="q-balanced" title="Balanceada" hint={qualityHint.balanced} />
                  <OptionButton value="high" id="q-high" title="Alta" hint={qualityHint.high} />
                </RadioGroup>
              </div>

              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-900">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                    <p className="font-medium">Información sobre la exportación</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      {effectiveEngine === "ffmpeg" && (
                        <li>La primera exportación descarga el motor ffmpeg (~30 MB).</li>
                      )}
                      {effectiveEngine !== "strip" && (
                        <li>Se captura frame a frame, así que tardará proporcionalmente a la duración.</li>
                      )}
                      <li>El navegador debe permanecer abierto y en primer plano durante el proceso.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button onClick={handleExport} className="w-full" size="lg" disabled={webcodecsSupported === null}>
                <Download className="h-4 w-4 mr-2" />
                Iniciar exportación
              </Button>
            </>
          )}

          {/* Progress */}
          {(isExporting || progress.phase === "done" || progress.phase === "error") && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <PhaseIcon phase={progress.phase} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{progress.message}</p>
                </div>
                {progress.phase === "done" && resultBlob && (
                  <Badge variant="secondary" className="shrink-0">
                    {formatBytes(resultBlob.size)}
                  </Badge>
                )}
              </div>

              <Progress
                value={progress.overallProgress * 100}
                className={`h-2 ${
                  progress.phase === "error"
                    ? "[&_[data-slot=progress-indicator]]:bg-destructive"
                    : progress.phase === "done"
                    ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
                    : progress.phase === "encoding" || progress.phase === "finalizing"
                    ? "[&_[data-slot=progress-indicator]]:bg-amber-500"
                    : ""
                }`}
              />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{(progress.overallProgress * 100).toFixed(0)}%</span>
                <span className="font-mono">
                  {formatElapsed(elapsedMs)}
                  {etaSeconds != null && (
                    <> · restante ~{formatElapsed(etaSeconds * 1000)}</>
                  )}
                </span>
              </div>

              {progress.phase === "error" && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
                  <p className="text-sm text-destructive">{progress.message}</p>
                </div>
              )}

              {progress.phase === "done" && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-950/30 dark:border-emerald-900">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    Video exportado en {formatElapsed(elapsedMs)}.{" "}
                    {savedToFile
                      ? "Guardado en la ubicación que elegiste."
                      : "Se ha descargado automáticamente."}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {isExporting && (
                  <Button variant="destructive" onClick={handleCancel} className="flex-1">
                    Cancelar
                  </Button>
                )}
                {(progress.phase === "done" || progress.phase === "error") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      reset()
                      setResultBlob(null)
                    }}
                    className="flex-1"
                  >
                    Exportar de nuevo
                  </Button>
                )}
                {progress.phase === "done" && resultBlob && (
                  <Button
                    onClick={() => {
                      const safeName = projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase() || "creditos"
                      triggerDownload(resultBlob, `${safeName}.${format}`)
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar de nuevo
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
