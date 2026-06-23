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
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type as TypeIcon,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { CreditItem, CreditItemType, CREDIT_TYPE_LABELS, Alignment, DividerStyle } from "@/lib/credit/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<CreditItemType, React.ComponentType<{ className?: string }>> = {
  title: Heading1,
  subtitle: Heading2,
  name: User,
  role: Briefcase,
  description: Text,
  spacer: Space,
  divider: Minus,
}

const ADD_MENU_TYPES: CreditItemType[] = [
  "title",
  "subtitle",
  "name",
  "role",
  "description",
  "spacer",
  "divider",
]

function ItemRow({ item, index, isSelected, onSelect }: {
  item: CreditItem
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  const { updateItem, removeItem, duplicateItem, moveItem, items, config } = useCreditStore()
  const Icon = TYPE_ICONS[item.type]
  const isFirst = index === 0
  const isLast = index === items.length - 1

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
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab opacity-50" />
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
          {item.type === "spacer" || item.type === "divider" ? (
            <p className={cn(
              "text-xs italic",
              config.mode === "appearing" ? "text-muted-foreground/50" : "text-muted-foreground",
            )}>
              {item.type === "spacer" ? "(espacio en blanco)" : "(línea separadora)"}
              {config.mode === "appearing" && " — no se aplica en aparición"}
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

      {isSelected && item.type !== "spacer" && item.type !== "divider" && (
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
            <Input
              value={item.dividerColor ?? ""}
              placeholder="vacío = global / texto"
              onChange={(e) => {
                const raw = e.target.value
                updateItem(item.id, { dividerColor: raw === "" ? undefined : raw })
              }}
              className="h-7 flex-1 font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function CreditEditor() {
  const { items, selectedItemId, selectItem, addItem, clearItems, loadItems } = useCreditStore()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const data = JSON.stringify({ items }, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "creditos-items.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (Array.isArray(parsed.items)) {
          loadItems(parsed.items)
        }
      } catch {
        // ignore
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Créditos</h3>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            Importar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={handleExport}
          >
            Exportar
          </Button>
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
          <Button
            size="sm"
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("¿Eliminar todos los créditos?")) clearItems()
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Vaciar lista
          </Button>
        </div>
      )}
    </div>
  )
}
