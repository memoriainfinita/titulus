"use client"

import * as React from "react"
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Heading1,
  Heading2,
  User,
  Briefcase,
  Text,
  Space,
  Minus,
  Image as ImageIcon,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type as TypeIcon,
} from "lucide-react"
import { useCreditStore, getFontSize } from "@/lib/credit/store"
import { resolveDivider } from "@/lib/credit/separators"
import { CreditItem, CreditConfig, CreditItemType, CREDIT_TYPE_LABELS, Alignment, DividerStyle, AnimationType, DEFAULT_ITEMS } from "@/lib/credit/types"
import { resolveAnimationType } from "@/lib/credit/appearing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<CreditItemType, React.ComponentType<{ className?: string }>> = {
  title: Heading1,
  subtitle: Heading2,
  name: User,
  role: Briefcase,
  description: Text,
  spacer: Space,
  divider: Minus,
  image: ImageIcon,
}

const ADD_MENU_TYPES: CreditItemType[] = [
  "title",
  "subtitle",
  "name",
  "role",
  "description",
  "spacer",
  "divider",
  "image",
]

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
            onClick={(e) => e.stopPropagation()}
            className="h-7 w-24 text-sm"
          />
          <span className="text-[10px] text-muted-foreground">vacío = global</span>
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
            onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-24 text-sm"
            />
          </div>
        </>
      )}
    </div>
  )
}

function ItemRow({ item, index, isSelected, onSelect }: {
  item: CreditItem
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  const { updateItem, removeItem, duplicateItem, moveItem, reorderItems, items, config, fonts } = useCreditStore()
  const Icon = TYPE_ICONS[item.type]
  const isFirst = index === 0
  const isLast = index === items.length - 1
  const [dragOver, setDragOver] = React.useState(false)

  const toggleBold = () => updateItem(item.id, { bold: !item.bold })
  const toggleItalic = () => updateItem(item.id, { italic: !item.italic })
  const toggleUppercase = () => updateItem(item.id, { uppercase: !item.uppercase })
  const setAlign = (align: Alignment) =>
    updateItem(item.id, { align: item.align === align ? undefined : align })

  return (
    <div
      className={cn(
        "group rounded-md border bg-card transition-colors cursor-pointer",
        isSelected ? "border-primary ring-1 ring-primary" : "hover:bg-accent/40",
        dragOver && "border-primary border-dashed",
      )}
      onClick={onSelect}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const fromId = e.dataTransfer.getData("text/plain")
        if (fromId && fromId !== item.id) reorderItems(fromId, item.id)
      }}
    >
      <div className="flex items-center gap-2 p-2">
        <span
          className="shrink-0 cursor-grab"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", item.id)
            e.dataTransfer.effectAllowed = "move"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
        </span>
        <div className="flex items-center justify-center w-7 h-7 rounded bg-muted shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              {CREDIT_TYPE_LABELS[item.type]}
            </span>
            {item.bold && <Badge variant="secondary" className="text-[10px] py-0 px-1">B</Badge>}
            {item.italic && <Badge variant="secondary" className="text-[10px] py-0 px-1">I</Badge>}
            {item.uppercase && <Badge variant="secondary" className="text-[10px] py-0 px-1">AA</Badge>}
            {item.align && <Badge variant="secondary" className="text-[10px] py-0 px-1">{item.align}</Badge>}
            {config.mode === "appearing" && item.pauseOverride != null && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1">{item.pauseOverride}s</Badge>
            )}
          </div>
          {item.type === "spacer" || item.type === "divider" || item.type === "image" ? (
            <p className={cn(
              "text-xs italic",
              config.mode === "appearing" && (item.type === "spacer" || item.type === "divider")
                ? "text-muted-foreground/50"
                : "text-muted-foreground",
            )}>
              {item.type === "spacer"
                ? "(espacio en blanco)"
                : item.type === "divider"
                  ? "(línea separadora)"
                  : item.imageSrc ? "(logo cargado)" : "(logo / imagen sin cargar)"}
              {config.mode === "appearing" && (item.type === "spacer" || item.type === "divider") && " — no se aplica en aparición"}
            </p>
          ) : (
            <p className="text-sm truncate">{item.text || <span className="text-muted-foreground italic">(vacío)</span>}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={isFirst}
                  onClick={() => moveItem(item.id, "up")}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mover arriba</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  disabled={isLast}
                  onClick={() => moveItem(item.id, "down")}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mover abajo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => duplicateItem(item.id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duplicar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isSelected && item.type !== "spacer" && item.type !== "divider" && item.type !== "image" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30">
          {item.type === "title" || item.type === "subtitle" ? (
            <Input
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
              placeholder="Escribe el texto..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <Textarea
              value={item.text}
              onChange={(e) => updateItem(item.id, { text: e.target.value })}
              placeholder="Escribe el texto..."
              rows={2}
              className="resize-none text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={item.bold ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); toggleBold() }}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={item.italic ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); toggleItalic() }}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={item.uppercase ? "secondary" : "ghost"}
              className="h-7 w-7 p-0 text-xs font-bold"
              onClick={(e) => { e.stopPropagation(); toggleUppercase() }}
            >
              AA
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              size="sm"
              variant={item.align === "left" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); setAlign("left") }}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={item.align === "center" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); setAlign("center") }}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={item.align === "right" ? "secondary" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={(e) => { e.stopPropagation(); setAlign("right") }}
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
                onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-24 text-sm"
            />
            <span className="text-[10px] text-muted-foreground">vacío = global</span>
          </div>
          <div className="border-t pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Tamaño</span>
              <Input
                type="number" min={1} step={1}
                value={item.fontSize ?? ""}
                placeholder={String(getFontSize(item.type, config))}
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { fontSize: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { fontSize: Math.max(1, n) })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
              <span className="text-[10px] text-muted-foreground">vacío = global</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Color</span>
              <div className="relative w-7 h-7 rounded-md border overflow-hidden shrink-0">
                <input
                  type="color"
                  value={item.color?.trim() ? item.color : config.textColor}
                  onChange={(e) => updateItem(item.id, { color: e.target.value })}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
                <div className="w-full h-full" style={{ backgroundColor: item.color?.trim() ? item.color : config.textColor }} />
              </div>
              <Input
                value={item.color ?? ""}
                placeholder="global"
                onChange={(e) => {
                  const raw = e.target.value
                  updateItem(item.id, { color: raw === "" ? undefined : raw })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 flex-1 font-mono text-xs"
              />
              {item.color != null && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                  onClick={(e) => { e.stopPropagation(); updateItem(item.id, { color: undefined }) }}>
                  global
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Fuente</span>
              <Select
                value={item.fontFamily ?? "__global"}
                onValueChange={(v) =>
                  updateItem(item.id, { fontFamily: v === "__global" ? undefined : v })
                }
              >
                <SelectTrigger className="h-7 text-sm flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__global">(global)</SelectItem>
                  {fonts.map((f) => (
                    <SelectItem key={f.id} value={f.family}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">Peso</span>
              <Input
                type="number" min={100} max={900} step={100}
                value={item.fontWeight ?? ""}
                placeholder="global"
                onChange={(e) => {
                  const raw = e.target.value
                  if (raw === "") { updateItem(item.id, { fontWeight: undefined }); return }
                  const n = Number(raw); if (Number.isNaN(n)) return
                  updateItem(item.id, { fontWeight: Math.max(1, n) })
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
              <span className="text-[10px] text-muted-foreground">vacío = global</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap w-16">No envolver</span>
              <Switch
                checked={item.noWrap ?? false}
                onCheckedChange={(v) => updateItem(item.id, { noWrap: v || undefined })}
                onClick={(e) => e.stopPropagation()}
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
                onClick={(e) => e.stopPropagation()}
                className="h-7 w-24 text-sm"
              />
            </div>
          </div>
          {config.mode === "appearing" && (
            <AnimationOverrides item={item} config={config} updateItem={updateItem} />
          )}
        </div>
      )}

      {isSelected && item.type === "spacer" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {isSelected && item.type === "divider" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {isSelected && item.type === "image" && (
        <div className="border-t px-2 py-2 space-y-2 bg-muted/30" onClick={(e) => e.stopPropagation()}>
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
      )}
    </div>
  )
}

export function CreditEditor() {
  const { items, selectedItemId, selectItem, addItem, clearItems, loadItems } = useCreditStore()
  const [exampleOpen, setExampleOpen] = React.useState(false)

  const loadExample = () => loadItems(DEFAULT_ITEMS.map((i) => ({ ...i })))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Créditos</h3>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              if (items.length === 0) loadExample()
              else setExampleOpen(true)
            }}
          >
            Ejemplo
          </Button>
          <AlertDialog open={exampleOpen} onOpenChange={setExampleOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cargar créditos de ejemplo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Reemplaza la lista actual por los créditos de ejemplo. Se perderán los cambios no exportados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={loadExample}>Cargar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="p-3 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="w-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Añadir crédito
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {ADD_MENU_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type]
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={() => addItem(type)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {CREDIT_TYPE_LABELS[type]}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-1.5">
          {items.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <TypeIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              No hay créditos todavía.
              <br />
              Haz clic en "Añadir crédito" para empezar.
            </div>
          )}
          {items.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              index={idx}
              isSelected={selectedItemId === item.id}
              onSelect={() => selectItem(item.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {items.length > 0 && (
        <div className="p-3 border-t">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vaciar lista
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar todos los créditos?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se vaciará toda la lista. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => clearItems()}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
