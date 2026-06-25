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
  SquareDashedBottom,
  SquareDashed,
  SkipBack,
  SkipForward,
} from "lucide-react"

// Broadcast-style guide margins, as a fraction of the stage inset on each edge.
const ACTION_SAFE_INSET = 0.05 // 90% box
const TITLE_SAFE_INSET = 0.1 // 80% box

function SafeMarginsOverlay() {
  const box = (inset: number): React.CSSProperties => ({
    position: "absolute",
    top: `${inset * 100}%`,
    left: `${inset * 100}%`,
    right: `${inset * 100}%`,
    bottom: `${inset * 100}%`,
    border: "1px dashed rgba(255,255,255,0.6)",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
    pointerEvents: "none",
  })
  return (
    <div className="absolute inset-0 z-20 pointer-events-none" aria-hidden>
      <div style={box(ACTION_SAFE_INSET)} />
      <div style={box(TITLE_SAFE_INSET)} />
    </div>
  )
}
import { useCreditStore } from "@/lib/credit/store"
import { ScrollCredits } from "./ScrollCredits"
import { AppearingCredits, getVisibleItems } from "./AppearingCredits"
import { TimelineBar } from "./TimelineBar"
import { getAppearItemDuration } from "@/lib/credit/appearing"
import { scrollProgressForItem, activeItemIndexAtProgress } from "@/lib/credit/scroll"
import { itemProgressBounds } from "@/lib/credit/timeline"
import { isInteractiveTarget } from "@/lib/credit/keyboard"
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

  // Timeline state
  const progressRef = React.useRef(0)
  const [manualSeek, setManualSeek] = React.useState<number | null>(null)
  const [currentItemIndex, setCurrentItemIndex] = React.useState(0)

  // Scroll geometry reported by the visible ScrollCredits (for seek + active item).
  const scrollLayoutRef = React.useRef<{
    offsets: { id: string; top: number; height: number }[]
    contentHeight: number
    containerHeight: number
  } | null>(null)
  const seekTarget = useCreditStore((s) => s.seekTarget)
  const setActiveItem = useCreditStore((s) => s.setActiveItem)

  const navBounds = React.useMemo(
    () => itemProgressBounds(getVisibleItems(items).map((i) => getAppearItemDuration(i, config))),
    [items, config],
  )
  const navCount = navBounds.length

  const seekToItem = (idx: number) => {
    const b = navBounds[idx]
    if (!b) return
    setPlaying(false)
    // Land mid-item: robust against float rounding that could fall into the previous item.
    setManualSeek((b.start + b.end) / 2)
    setCurrentItemIndex(idx)
  }

  // Double-click on a list row requests a seek to that item.
  React.useEffect(() => {
    if (!seekTarget) return
    if (config.mode === "appearing") {
      const visible = getVisibleItems(items)
      const idx = visible.findIndex((i) => i.id === seekTarget.id)
      if (idx >= 0) seekToItem(idx) // no-op si el item no es visible (spacer/divider)
      return
    }
    // scroll: usar la geometría real medida
    const layout = scrollLayoutRef.current
    if (!layout) return
    const off = layout.offsets.find((o) => o.id === seekTarget.id)
    if (!off) return
    const p = scrollProgressForItem(
      off.top, off.height, layout.contentHeight, layout.containerHeight,
      config.scrollDirection, 0.5,
    )
    setPlaying(false)
    setManualSeek(p)
  }, [seekTarget]) // eslint-disable-line react-hooks/exhaustive-deps

  // Active item in appearing mode: map the visible index to its id.
  React.useEffect(() => {
    if (config.mode !== "appearing") return
    const visible = getVisibleItems(items)
    setActiveItem(visible[currentItemIndex]?.id ?? null)
  }, [config.mode, items, currentItemIndex, setActiveItem])

  // Active item in scroll mode: own RAF over the real geometry. During scrubbing
  // ScrollCredits doesn't emit onProgressChange, so prefer the live scrub value;
  // manualSeek is state, invisible to the RAF closure, so mirror it in a ref.
  const manualSeekRef = React.useRef<number | null>(manualSeek)
  React.useEffect(() => { manualSeekRef.current = manualSeek }, [manualSeek])

  React.useEffect(() => {
    if (config.mode !== "scroll") return
    let raf: number
    const tick = () => {
      const layout = scrollLayoutRef.current
      if (layout && layout.offsets.length > 0) {
        const p = manualSeekRef.current !== null ? manualSeekRef.current : progressRef.current
        const idx = activeItemIndexAtProgress(
          layout.offsets, layout.contentHeight, layout.containerHeight,
          config.scrollDirection, p, 0.5,
        )
        const id = idx >= 0 ? layout.offsets[idx].id : null
        setActiveItem(id) // no-op interno si no cambia
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [config.mode, config.scrollDirection, setActiveItem])

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

  // Spacebar toggles play/pause, except while typing in a field or focusing a control.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return
      if (isInteractiveTarget(e.target)) return
      e.preventDefault()
      const next = !useCreditStore.getState().isPlaying
      setPlaying(next)
      if (next) setManualSeek(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
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
              manualProgress={manualSeek}
              onProgressChange={(p) => { progressRef.current = p }}
              onLayoutChange={(l) => { scrollLayoutRef.current = l }}
            />
          ) : (
            <AppearingCredits
              items={items}
              config={config}
              isPlaying={isPlaying}
              restartKey={previewKey}
              manualProgress={manualSeek}
              onProgressChange={(p) => { progressRef.current = p }}
              onIndexChange={setCurrentItemIndex}
            />
          )}
          {config.showSafeMargins && <SafeMarginsOverlay />}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 px-3 pt-2">
        {config.mode === "appearing" && (
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
            onClick={() => seekToItem(Math.max(0, currentItemIndex - 1))}
            disabled={currentItemIndex <= 0} title="Item anterior">
            <SkipBack className="h-4 w-4" />
          </Button>
        )}
        <TimelineBar
          progressRef={progressRef}
          seekValue={manualSeek}
          onSeekStart={() => { setPlaying(false); setManualSeek(progressRef.current) }}
          onSeek={(v) => setManualSeek(v)}
          ticks={config.mode === "appearing" ? navBounds.map((b) => b.start) : undefined}
        />
        {config.mode === "appearing" && (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0"
              onClick={() => seekToItem(Math.min(navCount - 1, currentItemIndex + 1))}
              disabled={currentItemIndex >= navCount - 1} title="Item siguiente">
              <SkipForward className="h-4 w-4" />
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-12 text-right">
              {navCount > 0 ? `${Math.min(currentItemIndex, navCount - 1) + 1} / ${navCount}` : "0 / 0"}
            </span>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 p-3 border-t bg-background">
        <Button
          size="sm"
          variant={isPlaying ? "default" : "outline"}
          onClick={() => {
            const next = !isPlaying
            setPlaying(next)
            if (next) setManualSeek(null) // resume: clear the frozen seek (ScrollCredits seeds from it)
          }}
        >
          {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
          {isPlaying ? "Pausar" : "Reproducir"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setManualSeek(null); restartPreview() }}>
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
        <Button
          size="sm"
          variant={config.showSafeMargins ? "default" : "outline"}
          onClick={() => updateConfig({ showSafeMargins: !config.showSafeMargins })}
          title="Mostrar guía de márgenes seguros (no se exporta)"
        >
          <SquareDashedBottom className="h-4 w-4 mr-1" />
          Guía
        </Button>
        <Button
          size="sm"
          variant={config.respectSafeMargins ? "default" : "outline"}
          onClick={() => updateConfig({ respectSafeMargins: !config.respectSafeMargins })}
          title="Constreñir el contenido a los márgenes seguros (afecta al vídeo)"
        >
          <SquareDashed className="h-4 w-4 mr-1" />
          Respetar
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
