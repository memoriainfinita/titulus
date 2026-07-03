"use client"

import * as React from "react"
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { resolveDivider } from "@/lib/credit/separators"
import { CreditItem, CreditConfig, Alignment, DividerStyle, AnimationType } from "@/lib/credit/types"
import { resolveAnimationType, resolveStaggerLines } from "@/lib/credit/appearing"
import { plainToRich } from "@/lib/credit/rich"
import { RichTextEditor } from "./RichTextEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ANIMATIONS: { value: AnimationType; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide-up", label: "Deslizar arriba" },
  { value: "slide-down", label: "Deslizar abajo" },
  { value: "slide-left", label: "Deslizar izquierda" },
  { value: "slide-right", label: "Deslizar derecha" },
  { value: "zoom", label: "Zoom" },
  { value: "blur", label: "Desenfoque" },
  { value: "typewriter", label: "Máquina de escribir" },
]

// Per-item animation overrides (appearing mode). Shown for text and image items.
function AnimationOverrides({
  item,
  config,
  updateItem,
}: {
  item: CreditItem
  config: CreditConfig
  updateItem: (id: string, patch: Partial<CreditItem>) => void
}) {
  const effectiveType = resolveAnimationType(item, config)
  const effectiveStagger = resolveStaggerLines(item, config)
  const numHandler =
    (key: keyof CreditItem, min?: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (raw === "") {
        updateItem(item.id, { [key]: undefined } as Partial<CreditItem>)
        return
      }
      const n = Number(raw)
      if (Number.isNaN(n)) return
      const v = min != null ? Math.max(min, n) : n
      updateItem(item.id, { [key]: v } as Partial<CreditItem>)
    }
  return (
    <div className="border-t pt-2 space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Animación (este item)</div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Tipo</span>
        <Select
          value={item.animationType ?? "__global"}
          onValueChange={(v) =>
            updateItem(item.id, { animationType: v === "__global" ? undefined : (v as AnimationType) })
          }
        >
          <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__global">(global)</SelectItem>
            {ANIMATIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {effectiveType !== "typewriter" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Duración (s)</span>
          <Input
            type="number" min={0.1} step={0.1}
            value={item.animationDuration ?? ""}
            placeholder={String(config.animationDuration)}
            onChange={numHandler("animationDuration", 0.1)}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">vacío = global</span>
        </div>
      )}
      {effectiveType === "typewriter" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Vel. tecleo</span>
          <Input
            type="number" min={1} step={1}
            value={item.typewriterSpeed ?? ""}
            placeholder={String(config.typewriterSpeed)}
            onChange={numHandler("typewriterSpeed", 1)}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">ms · vacío = global</span>
        </div>
      )}
      {effectiveType !== "typewriter" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Línea a línea</span>
          <Select
            value={item.staggerLines === undefined ? "__global" : item.staggerLines ? "on" : "off"}
            onValueChange={(v) =>
              updateItem(item.id, { staggerLines: v === "__global" ? undefined : v === "on" })
            }
          >
            <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__global">(global)</SelectItem>
              <SelectItem value="on">Sí</SelectItem>
              <SelectItem value="off">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {effectiveType !== "typewriter" && effectiveStagger && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Interv. línea</span>
          <Input
            type="number" min={0.1} step={0.1}
            value={item.lineRevealInterval ?? ""}
            placeholder={String(config.lineRevealInterval)}
            onChange={numHandler("lineRevealInterval", 0.1)}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">s · vacío = global</span>
        </div>
      )}
      {effectiveType.startsWith("slide") && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Distancia</span>
          <Input
            type="number" step={1}
            value={item.animSlideDistance ?? ""}
            placeholder={String(config.animSlideDistance)}
            onChange={numHandler("animSlideDistance")}
            className="h-7 w-24 text-sm"
          />
        </div>
      )}
      {effectiveType === "blur" && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Desenfoque</span>
          <Input
            type="number" min={0} step={1}
            value={item.animBlurAmount ?? ""}
            placeholder={String(config.animBlurAmount)}
            onChange={numHandler("animBlurAmount", 0)}
            className="h-7 w-24 text-sm"
          />
        </div>
      )}
      {effectiveType === "zoom" && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Zoom desde</span>
            <Input
              type="number" min={0} step={0.1}
              value={item.animZoomFrom ?? ""}
              placeholder={String(config.animZoomFrom)}
              onChange={numHandler("animZoomFrom", 0)}
              className="h-7 w-24 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Zoom hasta</span>
            <Input
              type="number" min={0} step={0.1}
              value={item.animZoomTo ?? ""}
              placeholder={String(config.animZoomTo)}
              onChange={numHandler("animZoomTo", 0)}
              className="h-7 w-24 text-sm"
            />
          </div>
        </>
      )}
    </div>
  )
}

function ShadowOverrides({
  item,
  config,
  updateItem,
}: {
  item: CreditItem
  config: CreditConfig
  updateItem: (id: string, patch: Partial<CreditItem>) => void
}) {
  const effectiveOn = item.useTextShadow ?? config.useTextShadow
  const numHandler =
    (key: keyof CreditItem, min?: number, max?: number) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      if (raw === "") {
        updateItem(item.id, { [key]: undefined } as Partial<CreditItem>)
        return
      }
      const n = Number(raw)
      if (Number.isNaN(n)) return
      let v = n
      if (min != null) v = Math.max(min, v)
      if (max != null) v = Math.min(max, v)
      updateItem(item.id, { [key]: v } as Partial<CreditItem>)
    }
  const effectiveColor = item.textShadowColor?.trim() ? item.textShadowColor : config.textShadowColor
  return (
    <div className="border-t pt-2 space-y-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Sombra (este item)</div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Estado</span>
        <Select
          value={item.useTextShadow === undefined ? "__global" : item.useTextShadow ? "on" : "off"}
          onValueChange={(v) =>
            updateItem(item.id, {
              useTextShadow: v === "__global" ? undefined : v === "on",
            })
          }
        >
          <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__global">(global)</SelectItem>
            <SelectItem value="on">Con sombra</SelectItem>
            <SelectItem value="off">Sin sombra</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {effectiveOn && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Color</span>
            <div className="relative w-7 h-7 rounded-md border overflow-hidden shrink-0">
              <input
                type="color"
                value={effectiveColor}
                onChange={(e) => updateItem(item.id, { textShadowColor: e.target.value })}
                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
              />
              <div className="w-full h-full" style={{ backgroundColor: effectiveColor }} />
            </div>
            <Input
              value={item.textShadowColor ?? ""}
              placeholder="global"
              onChange={(e) => {
                const raw = e.target.value
                updateItem(item.id, { textShadowColor: raw === "" ? undefined : raw })
              }}
              className="h-7 flex-1 font-mono text-xs"
            />
            {item.textShadowColor != null && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                onClick={() => updateItem(item.id, { textShadowColor: undefined })}>
                global
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Desenfoque</span>
            <Input
              type="number" min={0} step={1}
              value={item.textShadowBlur ?? ""}
              placeholder={String(config.textShadowBlur)}
              onChange={numHandler("textShadowBlur", 0)}
              className="h-7 w-24 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">vacío = global</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Offset X</span>
            <Input
              type="number" step={1}
              value={item.textShadowX ?? ""}
              placeholder={String(config.textShadowX)}
              onChange={numHandler("textShadowX")}
              className="h-7 w-24 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Offset Y</span>
            <Input
              type="number" step={1}
              value={item.textShadowY ?? ""}
              placeholder={String(config.textShadowY)}
              onChange={numHandler("textShadowY")}
              className="h-7 w-24 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Opacidad</span>
            <Input
              type="number" min={0} max={1} step={0.05}
              value={item.textShadowOpacity ?? ""}
              placeholder={String(config.textShadowOpacity)}
              onChange={numHandler("textShadowOpacity", 0, 1)}
              className="h-7 w-24 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">0-1 · vacío = global</span>
          </div>
        </>
      )}
    </div>
  )
}

export function ItemInspector({ item }: { item: CreditItem }) {
  const { updateItem, config } = useCreditStore()

  const toggleUppercase = () => updateItem(item.id, { uppercase: !item.uppercase })
  const setAlign = (align: Alignment) =>
    updateItem(item.id, { align: item.align === align ? undefined : align })

  if (item.type === "spacer") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Alto (px)</span>
          <Input
            type="number"
            min={0}
            step={4}
            value={item.spacerHeight ?? ""}
            placeholder={String(config.spacerHeight)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") { updateItem(item.id, { spacerHeight: undefined }); return }
              const n = Number(raw)
              if (Number.isNaN(n)) return
              updateItem(item.id, { spacerHeight: Math.max(0, n) })
            }}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">vacío = global</span>
        </div>
        {config.mode === "appearing" && (
          <p className="text-[10px] text-muted-foreground italic">No se aplica en aparición.</p>
        )}
      </div>
    )
  }

  if (item.type === "divider") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Grosor</span>
            <Input
              type="number" min={0} step={1}
              value={item.dividerThickness ?? ""}
              placeholder={String(config.dividerThickness)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") { updateItem(item.id, { dividerThickness: undefined }); return }
                const n = Number(raw); if (Number.isNaN(n)) return
                updateItem(item.id, { dividerThickness: Math.max(0, n) })
              }}
              className="h-7 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Ancho %</span>
            <Input
              type="number" min={0} max={100} step={1}
              value={item.dividerWidth ?? ""}
              placeholder={String(config.dividerWidth)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") { updateItem(item.id, { dividerWidth: undefined }); return }
                const n = Number(raw); if (Number.isNaN(n)) return
                updateItem(item.id, { dividerWidth: Math.max(0, Math.min(100, n)) })
              }}
              className="h-7 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Opacidad</span>
            <Input
              type="number" min={0} max={1} step={0.05}
              value={item.dividerOpacity ?? ""}
              placeholder={String(config.dividerOpacity)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "") { updateItem(item.id, { dividerOpacity: undefined }); return }
                const n = Number(raw); if (Number.isNaN(n)) return
                updateItem(item.id, { dividerOpacity: Math.max(0, Math.min(1, n)) })
              }}
              className="h-7 text-sm"
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Estilo</span>
          <Select
            value={item.dividerStyle ?? "__global"}
            onValueChange={(v) =>
              updateItem(item.id, { dividerStyle: v === "__global" ? undefined : (v as DividerStyle) })
            }
          >
            <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__global">(global)</SelectItem>
              <SelectItem value="solid">Sólida</SelectItem>
              <SelectItem value="dashed">Discontinua</SelectItem>
              <SelectItem value="dotted">Punteada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Color</span>
          <div className="relative w-7 h-7 rounded-md border overflow-hidden shrink-0">
            <input
              type="color"
              value={resolveDivider(item, config).color}
              onChange={(e) => updateItem(item.id, { dividerColor: e.target.value })}
              className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            />
            <div className="w-full h-full" style={{ backgroundColor: resolveDivider(item, config).color }} />
          </div>
          <Input
            value={item.dividerColor ?? ""}
            placeholder="global"
            onChange={(e) => {
              const raw = e.target.value
              updateItem(item.id, { dividerColor: raw === "" ? undefined : raw })
            }}
            className="h-7 flex-1 font-mono text-xs"
          />
          {item.dividerColor != null && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px]"
              onClick={() => updateItem(item.id, { dividerColor: undefined })}
            >
              global
            </Button>
          )}
        </div>
        {config.mode === "appearing" && (
          <p className="text-[10px] text-muted-foreground italic">No se aplica en aparición.</p>
        )}
      </div>
    )
  }

  if (item.type === "image") {
    return (
      <div className="space-y-2">
        {item.imageSrc && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageSrc} alt="" className="h-12 w-auto max-w-[120px] rounded border object-contain bg-background" />
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-destructive"
              onClick={() => updateItem(item.id, { imageSrc: undefined })}>
              Quitar
            </Button>
          </div>
        )}
        <div>
          <input
            type="file"
            accept="image/*"
            id={`logo-file-${item.id}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => updateItem(item.id, { imageSrc: String(reader.result) })
              reader.readAsDataURL(file)
              e.target.value = ""
            }}
          />
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <label htmlFor={`logo-file-${item.id}`} className="cursor-pointer">
              {item.imageSrc ? "Cambiar imagen" : "Subir imagen"}
            </label>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Ancho %</span>
          <Input
            type="number" min={0} max={100} step={1}
            value={item.imageWidth ?? ""}
            placeholder={String(config.imageWidth)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") { updateItem(item.id, { imageWidth: undefined }); return }
              const n = Number(raw); if (Number.isNaN(n)) return
              updateItem(item.id, { imageWidth: Math.max(0, Math.min(100, n)) })
            }}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">vacío = global</span>
        </div>
        {config.mode === "appearing" && (
          <AnimationOverrides item={item} config={config} updateItem={updateItem} />
        )}
      </div>
    )
  }

  // Text item: rich editor plus layout/effect overrides
  return (
    <div className="space-y-2">
      <RichTextEditor
        itemId={item.id}
        rich={item.rich ?? plainToRich(item.text)}
        onChange={(rich) => updateItem(item.id, { rich })}
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={item.uppercase ? "secondary" : "ghost"}
          className="h-7 w-7 p-0 text-xs font-bold"
          onClick={toggleUppercase}
        >
          AA
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          size="sm"
          variant={item.align === "left" ? "secondary" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => setAlign("left")}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={item.align === "center" ? "secondary" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => setAlign("center")}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant={item.align === "right" ? "secondary" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => setAlign("right")}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      {config.mode === "appearing" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Pausa (s)</span>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={item.pauseOverride ?? ""}
            placeholder={String(config.pauseDuration)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") {
                updateItem(item.id, { pauseOverride: undefined })
                return
              }
              const n = Number(raw)
              if (Number.isNaN(n)) return
              updateItem(item.id, { pauseOverride: Math.max(0, n) })
            }}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">vacío = global</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Desenfoque (px)</span>
        <Input
          type="number"
          min={0}
          step={0.5}
          value={item.textBlur ?? ""}
          placeholder={String(config.textBlur)}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === "") { updateItem(item.id, { textBlur: undefined }); return }
            const n = Number(raw)
            if (Number.isNaN(n)) return
            updateItem(item.id, { textBlur: Math.max(0, n) })
          }}
          className="h-7 w-24 text-sm"
        />
        <span className="text-[10px] text-muted-foreground">vacío = global</span>
      </div>
      <div className="border-t pt-2 space-y-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Estilo de texto</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Interletra</span>
          <Input
            type="number" step={0.5}
            value={item.letterSpacing ?? ""}
            placeholder={String(config.letterSpacing)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") { updateItem(item.id, { letterSpacing: undefined }); return }
              const n = Number(raw); if (Number.isNaN(n)) return
              updateItem(item.id, { letterSpacing: n })
            }}
            className="h-7 w-24 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Interlínea</span>
          <Input
            type="number" min={0.1} step={0.1}
            value={item.lineHeight ?? ""}
            placeholder={String(config.lineHeight)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") { updateItem(item.id, { lineHeight: undefined }); return }
              const n = Number(raw); if (Number.isNaN(n)) return
              updateItem(item.id, { lineHeight: Math.max(0.1, n) })
            }}
            className="h-7 w-24 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">No envolver</span>
          <Switch
            checked={item.noWrap ?? false}
            onCheckedChange={(v) => updateItem(item.id, { noWrap: v || undefined })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Ancho caja</span>
          <Input
            type="number" min={1} max={100} step={1}
            value={item.textBoxWidth ?? ""}
            placeholder={String(config.textBoxWidth)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") { updateItem(item.id, { textBoxWidth: undefined }); return }
              const n = Number(raw); if (Number.isNaN(n)) return
              updateItem(item.id, { textBoxWidth: Math.max(1, Math.min(100, n)) })
            }}
            className="h-7 w-24 text-sm"
          />
        </div>
      </div>
      <ShadowOverrides item={item} config={config} updateItem={updateItem} />
      {config.mode === "appearing" && (
        <AnimationOverrides item={item} config={config} updateItem={updateItem} />
      )}
    </div>
  )
}
