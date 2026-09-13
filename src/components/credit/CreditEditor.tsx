"use client"

import * as React from "react"
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Space,
  Minus,
  Image as ImageIcon,
  Type as TypeIcon,
  Layers,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { useShallow } from "zustand/react/shallow"
import { CreditItem, CreditItemType, CREDIT_TYPE_LABELS, DEFAULT_ITEMS } from "@/lib/credit/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
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
  text: TypeIcon,
  spacer: Space,
  divider: Minus,
  image: ImageIcon,
  overlay: Layers,
}

const ADD_MENU_TYPES: CreditItemType[] = ["text", "spacer", "divider", "image", "overlay"]

// Types that don't take part in appearing mode.
const SCROLL_ONLY_TYPES: CreditItemType[] = ["spacer", "divider", "overlay"]

function ItemRow({ item, index, isSelected, onSelect }: {
  item: CreditItem
  index: number
  isSelected: boolean
  onSelect: () => void
}) {
  const { removeItem, duplicateItem, moveItem, reorderItems, items, config, requestSeek } = useCreditStore(
    useShallow((s) => ({ removeItem: s.removeItem, duplicateItem: s.duplicateItem, moveItem: s.moveItem, reorderItems: s.reorderItems, items: s.items, config: s.config, requestSeek: s.requestSeek })),
  )
  const isActive = useCreditStore((s) => s.activeItemId === item.id)
  const Icon = TYPE_ICONS[item.type]
  const isFirst = index === 0
  const isLast = index === items.length - 1
  const [dragOver, setDragOver] = React.useState(false)

  return (
    <div
      className={cn(
        "group rounded-md border bg-card transition-colors cursor-pointer",
        isSelected ? "border-primary ring-1 ring-primary" : "hover:bg-accent/40",
        isActive && "ring-1 ring-amber-400/70",
        dragOver && "border-primary border-dashed",
      )}
      onClick={onSelect}
      onDoubleClick={() => requestSeek(item.id)}
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
            {item.uppercase && <Badge variant="secondary" className="text-[10px] py-0 px-1">AA</Badge>}
            {item.align && <Badge variant="secondary" className="text-[10px] py-0 px-1">{item.align}</Badge>}
            {config.mode === "appearing" && item.pauseOverride != null && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1">{item.pauseOverride}s</Badge>
            )}
          </div>
          {item.type !== "text" ? (
            <p className={cn(
              "text-xs italic",
              config.mode === "appearing" && SCROLL_ONLY_TYPES.includes(item.type)
                ? "text-muted-foreground/50"
                : "text-muted-foreground",
            )}>
              {item.type === "spacer"
                ? "(espacio en blanco)"
                : item.type === "divider"
                  ? "(línea separadora)"
                  : item.type === "overlay"
                    ? item.imageSrc ? "(imagen fija cargada)" : "(imagen fija sin cargar)"
                    : item.imageSrc ? "(logo cargado)" : "(logo / imagen sin cargar)"}
              {config.mode === "appearing" && SCROLL_ONLY_TYPES.includes(item.type) && " — no se aplica en aparición"}
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

    </div>
  )
}

function InsertGap({ index }: { index: number }) {
  const addItem = useCreditStore((s) => s.addItem)
  return (
    <div className="relative h-2 group/gap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Insertar aquí"
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-0 group-hover/gap:opacity-100 transition-opacity"
          >
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background border rounded-full px-2 py-0.5">
              <Plus className="h-3 w-3" /> Insertar
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {ADD_MENU_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type]
            return (
              <DropdownMenuItem key={type} onClick={() => addItem(type, undefined, index)}>
                <Icon className="h-4 w-4 mr-2" />
                {CREDIT_TYPE_LABELS[type]}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function CreditEditor() {
  const { items, selectedItemId, selectItem, addItem, clearItems, loadItems } = useCreditStore(
    useShallow((s) => ({ items: s.items, selectedItemId: s.selectedItemId, selectItem: s.selectItem, addItem: s.addItem, clearItems: s.clearItems, loadItems: s.loadItems })),
  )
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
              Haz clic en &quot;Añadir crédito&quot; para empezar.
            </div>
          )}
          {items.map((item, idx) => (
            <React.Fragment key={item.id}>
              <InsertGap index={idx} />
              <ItemRow
                item={item}
                index={idx}
                isSelected={selectedItemId === item.id}
                onSelect={() => selectItem(selectedItemId === item.id ? null : item.id)}
              />
            </React.Fragment>
          ))}
          {items.length > 0 && <InsertGap index={items.length} />}
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
