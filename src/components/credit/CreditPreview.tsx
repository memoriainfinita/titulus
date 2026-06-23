"use client"

import * as React from "react"
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Upload,
  Eye,
  Video,
  Repeat,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { ScrollCredits } from "./ScrollCredits"
import { AppearingCredits } from "./AppearingCredits"
import { ExportDialog } from "./ExportDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export function CreditPreview() {
  const {
    items,
    config,
    isPlaying,
    isFullscreen,
    previewKey,
    updateConfig,
    setPlaying,
    setFullscreen,
    restartPreview,
    exportProject,
    importProject,
    projectName,
    setProjectName,
  } = useCreditStore()

  const stageRef = React.useRef<HTMLDivElement>(null)
  const exportStageRef = React.useRef<HTMLDivElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [scale, setScale] = React.useState(1)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [exportProgress, setExportProgress] = React.useState<number | null>(null)
  const [measuredDuration, setMeasuredDuration] = React.useState(10)

  // Calculate scale to fit stage inside container
  React.useEffect(() => {
    const updateScale = () => {
      const container = stageRef.current?.parentElement
      if (!container) return
      // Use the container's content box (excluding padding) for accurate fitting
      const cs = getComputedStyle(container)
      const cw = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const ch = container.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      if (cw <= 0 || ch <= 0) return
      const scaleX = cw / config.stageWidth
      const scaleY = ch / config.stageHeight
      const s = Math.min(scaleX, scaleY, 1)
      setScale(s)
    }
    updateScale()
    // Use ResizeObserver for more reliable container size tracking
    const ro = new ResizeObserver(updateScale)
    if (stageRef.current?.parentElement) {
      ro.observe(stageRef.current.parentElement)
    }
    window.addEventListener("resize", updateScale)
    return () => {
      window.removeEventListener("resize", updateScale)
      ro.disconnect()
    }
  }, [config.stageWidth, config.stageHeight])

  // Auto-start playing on mount
  React.useEffect(() => {
    setPlaying(true)
  }, [setPlaying])

  // Fullscreen change detection
  React.useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [setFullscreen])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await stageRef.current?.requestFullscreen()
        setFullscreen(true)
      } catch (err) {
        toast.error("No se pudo activar pantalla completa")
      }
    } else {
      await document.exitFullscreen()
      setFullscreen(false)
    }
  }

  const handleExport = () => {
    const json = exportProject()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Proyecto exportado")
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const ok = importProject(reader.result as string)
      if (ok) toast.success("Proyecto importado")
      else toast.error("Archivo inválido")
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="h-8 text-sm max-w-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button size="sm" variant="ghost" className="h-8" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Importar
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Proyecto
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={() => setExportOpen(true)}
          >
            <Video className="h-3.5 w-3.5 mr-1" />
            Exportar MP4
          </Button>
        </div>
      </div>

      {/* Stage area */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-4 overflow-hidden">
        <div
          ref={stageRef}
          className="relative shadow-2xl"
          style={{
            width: `${config.stageWidth}px`,
            height: `${config.stageHeight}px`,
            transform: `scale(${isFullscreen ? 1 : scale})`,
            transformOrigin: "center center",
            // Prevent flexbox from shrinking the stage below its declared size.
            // The visual scaling is handled by transform, the logical size must remain
            // intact so that the credits component measures the correct dimensions.
            flexShrink: 0,
          }}
        >
          {config.mode === "scroll" ? (
            <ScrollCredits
              items={items}
              config={config}
              isPlaying={isPlaying}
              restartKey={previewKey}
            />
          ) : (
            <AppearingCredits
              items={items}
              config={config}
              isPlaying={isPlaying}
              restartKey={previewKey}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 p-3 border-t bg-background">
        <Button
          size="sm"
          variant={isPlaying ? "default" : "outline"}
          onClick={() => setPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isPlaying ? "Pausar" : "Reproducir"}
        </Button>
        <Button size="sm" variant="outline" onClick={restartPreview}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reiniciar
        </Button>
        <Button
          size="sm"
          variant={config.loop ? "default" : "outline"}
          onClick={() => updateConfig({ loop: !config.loop })}
          title="Repetir en bucle"
        >
          <Repeat className="h-4 w-4 mr-1" />
          Bucle
        </Button>
        <Button size="sm" variant="outline" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize2 className="h-4 w-4 mr-1" /> : <Maximize2 className="h-4 w-4 mr-1" />}
          Pantalla completa
        </Button>
      </div>

      {/* Hidden export stage at full resolution (offscreen but rendered) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: `-${config.stageWidth + 100}px`,
          top: 0,
          width: `${config.stageWidth}px`,
          height: `${config.stageHeight}px`,
          pointerEvents: "none",
          // Keep visible (opacity 1) so html-to-image can capture it correctly
          // but moved offscreen so the user doesn't see it
          opacity: 1,
          zIndex: -1,
        }}
      >
        <div ref={exportStageRef} style={{ width: "100%", height: "100%" }}>
          {config.mode === "scroll" ? (
            <ScrollCredits
              items={items}
              config={config}
              isPlaying={false}
              restartKey={previewKey}
              manualProgress={exportProgress}
              onDurationChange={setMeasuredDuration}
            />
          ) : (
            <AppearingCredits
              items={items}
              config={config}
              isPlaying={false}
              restartKey={previewKey}
              manualProgress={exportProgress}
              onDurationChange={setMeasuredDuration}
            />
          )}
        </div>
      </div>

      {/* Export dialog */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={(o) => {
          setExportOpen(o)
          if (!o) setExportProgress(null)
        }}
        stageRef={exportStageRef}
        setManualProgress={setExportProgress}
        duration={measuredDuration}
      />
    </div>
  )
}
