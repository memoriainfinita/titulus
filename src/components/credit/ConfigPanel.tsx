"use client"

import * as React from "react"
import {
  Type,
  Palette,
  Layout,
  Sparkles,
  Settings2,
  RotateCcw,
  Gauge,
  Wand2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Bookmark,
  X,
  Minus,
  Image as ImageIcon,
  Monitor,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { CreditConfig, AnimationType, CreditMode, Alignment, DividerStyle, CREDIT_TYPE_LABELS } from "@/lib/credit/types"
import { DEFAULT_CONFIG } from "@/lib/credit/types"
import { FontManager } from "./FontManager"
import { ItemInspector } from "./ItemInspector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
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

// Section wrapper with a title and icon
function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="border-b">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-9 h-9 rounded-md border overflow-hidden shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        />
        <div className="w-full h-full" style={{ backgroundColor: value }} />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono text-xs"
      />
    </div>
  )
}

const STAGE_RATIOS: { label: string; value: CreditConfig["stageRatio"]; w: number; h: number }[] = [
  { label: "16:9 (Cine/Wide)", value: "16:9", w: 1280, h: 720 },
  { label: "21:9 (Ultra-wide)", value: "21:9", w: 1280, h: 549 },
  { label: "4:3 (Clásico)", value: "4:3", w: 1280, h: 960 },
  { label: "9:16 (Móvil)", value: "9:16", w: 405, h: 720 },
  { label: "1:1 (Cuadrado)", value: "1:1", w: 720, h: 720 },
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

export function InspectorPanel() {
  const { selectedItemId, items, resetConfig } = useCreditStore()
  const item = selectedItemId ? items.find((i) => i.id === selectedItemId) : undefined
  const [showGlobal, setShowGlobal] = React.useState(false)

  // Al cambiar de item, volver a la vista de item.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset intencional al cambiar la selección; patrón verificado
  React.useEffect(() => { setShowGlobal(false) }, [selectedItemId])

  const viewingItem = item && !showGlobal
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2 min-w-0">
          <Settings2 className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {viewingItem ? CREDIT_TYPE_LABELS[item.type] : "Configuración"}
          </span>
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <ToggleGroup
            type="single"
            value={viewingItem ? "item" : "global"}
            onValueChange={(v) => {
              if (v === "global") setShowGlobal(true)
              else if (v === "item" && item) setShowGlobal(false)
            }}
            className="border rounded-md"
          >
            <ToggleGroupItem value="item" disabled={!item} className="h-7 px-2 text-xs">
              Item
            </ToggleGroupItem>
            <ToggleGroupItem value="global" className="h-7 px-2 text-xs">
              Global
            </ToggleGroupItem>
          </ToggleGroup>
          {!viewingItem && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Restablecer configuración">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Restablecer toda la configuración?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos los ajustes volverán a sus valores por defecto. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetConfig()}>Restablecer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {viewingItem ? (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3"><ItemInspector item={item} /></div>
        </ScrollArea>
      ) : (
        <GlobalConfig />
      )}
    </div>
  )
}

function GlobalConfig() {
  const { config, updateConfig, fonts } = useCreditStore()

  return (
      <ScrollArea className="flex-1 min-h-0">
        <div>
          {/* STAGE */}
          <Section title="Escenario" icon={Monitor}>
            <Field label="Formato del escenario">
              <Select
                value={config.stageRatio}
                onValueChange={(v) => {
                  const ratio = STAGE_RATIOS.find((r) => r.value === v)
                  if (ratio) updateConfig({ stageRatio: v as CreditConfig["stageRatio"], stageWidth: ratio.w, stageHeight: ratio.h })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_RATIOS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          {/* MODE */}
          <Section title="Modo de crédito" icon={Sparkles}>
            <Field label="Estilo de presentación">
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={cn(
                    "p-3 rounded-md border-2 text-left transition-colors",
                    config.mode === "scroll"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40",
                  )}
                  onClick={() => updateConfig({ mode: "scroll" as CreditMode })}
                >
                  <ArrowUp className="h-4 w-4 mb-1" />
                  <div className="text-sm font-medium">Scroll</div>
                  <div className="text-xs text-muted-foreground">Estilo final de película</div>
                </button>
                <button
                  className={cn(
                    "p-3 rounded-md border-2 text-left transition-colors",
                    config.mode === "appearing"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/40",
                  )}
                  onClick={() => updateConfig({ mode: "appearing" as CreditMode })}
                >
                  <Type className="h-4 w-4 mb-1" />
                  <div className="text-sm font-medium">Aparición</div>
                  <div className="text-xs text-muted-foreground">Uno a uno con animación</div>
                </button>
              </div>
            </Field>
          </Section>

          {/* TYPOGRAPHY */}
          <Section title="Tipografía" icon={Type}>
            <Field label="Fuente activa">
              <div className="flex items-center gap-2">
                <Select
                  value={config.fontFamily}
                  onValueChange={(v) => updateConfig({ fontFamily: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map((f) => (
                      <SelectItem key={f.id} value={f.family}>
                        <span style={{ fontFamily: f.family }}>{f.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FontManager />
              </div>
            </Field>
            <Field label="Peso base" hint={`${config.fontWeight}`}>
              <Slider
                value={[config.fontWeight]}
                onValueChange={(v) => updateConfig({ fontWeight: v[0] })}
                min={100}
                max={900}
                step={100}
              />
            </Field>
            <Separator />
            <Field label="Tamaño base" hint={`${config.fontSize}px`}>
              <Slider
                value={[config.fontSize]}
                onValueChange={(v) => updateConfig({ fontSize: v[0] })}
                min={10}
                max={200}
                step={1}
              />
            </Field>
            <Separator />
            <Field label="Espaciado entre letras" hint={`${config.letterSpacing}px`}>
              <Slider
                value={[config.letterSpacing]}
                onValueChange={(v) => updateConfig({ letterSpacing: v[0] })}
                min={-5}
                max={20}
                step={0.5}
              />
            </Field>
            <Field label="Altura de línea" hint={`${config.lineHeight.toFixed(2)}`}>
              <Slider
                value={[config.lineHeight * 100]}
                onValueChange={(v) => updateConfig({ lineHeight: v[0] / 100 })}
                min={80}
                max={300}
                step={5}
              />
            </Field>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-xs">No envolver texto (respeta solo saltos manuales)</Label>
              <Switch
                checked={config.noWrap}
                onCheckedChange={(v) => updateConfig({ noWrap: v })}
              />
            </div>
            <Field label="Ancho de caja de texto" hint={`${config.textBoxWidth}%`}>
              <Slider
                value={[config.textBoxWidth]}
                onValueChange={(v) => updateConfig({ textBoxWidth: v[0] })}
                min={10}
                max={100}
                step={1}
              />
            </Field>
          </Section>

          {/* COLORS */}
          <Section title="Colores y fondo" icon={Palette}>
            <Field label="Color del texto">
              <ColorInput
                value={config.textColor}
                onChange={(v) => updateConfig({ textColor: v })}
              />
            </Field>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-xs">Usar degradado de fondo</Label>
              <Switch
                checked={config.useGradient}
                onCheckedChange={(v) => updateConfig({ useGradient: v })}
              />
            </div>
            {config.useGradient ? (
              <>
                <Field label="Color inicial del degradado">
                  <ColorInput
                    value={config.gradientFrom}
                    onChange={(v) => updateConfig({ gradientFrom: v })}
                  />
                </Field>
                <Field label="Color final del degradado">
                  <ColorInput
                    value={config.gradientTo}
                    onChange={(v) => updateConfig({ gradientTo: v })}
                  />
                </Field>
                <Field label="Ángulo del degradado" hint={`${config.gradientAngle}°`}>
                  <Slider
                    value={[config.gradientAngle]}
                    onValueChange={(v) => updateConfig({ gradientAngle: v[0] })}
                    min={0}
                    max={360}
                    step={5}
                  />
                </Field>
              </>
            ) : (
              <Field label="Color de fondo">
                <ColorInput
                  value={config.backgroundColor}
                  onChange={(v) => updateConfig({ backgroundColor: v })}
                />
              </Field>
            )}
          </Section>

          {/* EFFECTS */}
          <Section title="Efectos" icon={Wand2}>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Sombra de texto</Label>
              <Switch
                checked={config.useTextShadow}
                onCheckedChange={(v) => updateConfig({ useTextShadow: v })}
              />
            </div>
            {config.useTextShadow && (
              <>
                <Field label="Color de la sombra">
                  <ColorInput
                    value={config.textShadowColor}
                    onChange={(v) => updateConfig({ textShadowColor: v })}
                  />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="X" hint={`${config.textShadowX}px`}>
                    <Slider
                      value={[config.textShadowX]}
                      onValueChange={(v) => updateConfig({ textShadowX: v[0] })}
                      min={-20}
                      max={20}
                      step={1}
                    />
                  </Field>
                  <Field label="Y" hint={`${config.textShadowY}px`}>
                    <Slider
                      value={[config.textShadowY]}
                      onValueChange={(v) => updateConfig({ textShadowY: v[0] })}
                      min={-20}
                      max={20}
                      step={1}
                    />
                  </Field>
                  <Field label="Blur" hint={`${config.textShadowBlur}px`}>
                    <Slider
                      value={[config.textShadowBlur]}
                      onValueChange={(v) => updateConfig({ textShadowBlur: v[0] })}
                      min={0}
                      max={40}
                      step={1}
                    />
                  </Field>
                </div>
                <Field label="Opacidad de la sombra" hint={`${Math.round(config.textShadowOpacity * 100)}%`}>
                  <Slider
                    value={[config.textShadowOpacity]}
                    onValueChange={(v) => updateConfig({ textShadowOpacity: v[0] })}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </Field>
              </>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-xs">Viñeta (desvanecido superior/inferior)</Label>
              <Switch
                checked={config.vignetteEnabled}
                onCheckedChange={(v) => updateConfig({ vignetteEnabled: v })}
              />
            </div>
            {config.vignetteEnabled && (
              <Field label="Altura de la viñeta" hint={`${config.vignetteHeight}%`}>
                <Slider
                  value={[config.vignetteHeight]}
                  onValueChange={(v) => updateConfig({ vignetteHeight: v[0] })}
                  min={0}
                  max={50}
                  step={1}
                />
              </Field>
            )}
            <Separator />
            <Field label="Desenfoque del texto" hint={`${config.textBlur}px`}>
              <Slider
                value={[config.textBlur]}
                onValueChange={(v) => updateConfig({ textBlur: v[0] })}
                min={0}
                max={20}
                step={0.5}
              />
            </Field>
          </Section>

          {/* LAYOUT */}
          <Section title="Diseño" icon={Layout}>
            <Field label="Alineación global">
              <ToggleGroup
                type="single"
                value={config.alignment}
                onValueChange={(v) => v && updateConfig({ alignment: v as Alignment })}
                className="justify-start"
              >
                <ToggleGroupItem value="left" aria-label="Izquierda">
                  <AlignLeft className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="center" aria-label="Centro">
                  <AlignCenter className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="right" aria-label="Derecha">
                  <AlignRight className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
            <Field label="Espaciado entre items" hint={`${config.itemSpacing}px`}>
              <Slider
                value={[config.itemSpacing]}
                onValueChange={(v) => updateConfig({ itemSpacing: v[0] })}
                min={0}
                max={200}
                step={2}
              />
            </Field>
            <Field label="Padding horizontal" hint={`${config.paddingX}px`}>
              <Slider
                value={[config.paddingX]}
                onValueChange={(v) => updateConfig({ paddingX: v[0] })}
                min={0}
                max={400}
                step={5}
              />
            </Field>
          </Section>

          {/* SEPARATORS */}
          <Section title="Separadores" icon={Minus}>
            <Field label="Alto del espacio" hint={`${config.spacerHeight}px`}>
              <Slider
                value={[config.spacerHeight]}
                onValueChange={(v) => updateConfig({ spacerHeight: v[0] })}
                min={0}
                max={300}
                step={2}
              />
            </Field>
            <Field label="Grosor del separador" hint={`${config.dividerThickness}px`}>
              <Slider
                value={[config.dividerThickness]}
                onValueChange={(v) => updateConfig({ dividerThickness: v[0] })}
                min={0}
                max={20}
                step={1}
              />
            </Field>
            <Field label="Ancho del separador" hint={`${config.dividerWidth}%`}>
              <Slider
                value={[config.dividerWidth]}
                onValueChange={(v) => updateConfig({ dividerWidth: v[0] })}
                min={0}
                max={100}
                step={1}
              />
            </Field>
            <Field label="Opacidad del separador" hint={`${config.dividerOpacity.toFixed(2)}`}>
              <Slider
                value={[config.dividerOpacity * 100]}
                onValueChange={(v) => updateConfig({ dividerOpacity: v[0] / 100 })}
                min={0}
                max={100}
                step={5}
              />
            </Field>
            <Field label="Estilo del separador">
              <Select
                value={config.dividerStyle}
                onValueChange={(v) => updateConfig({ dividerStyle: v as DividerStyle })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Sólida</SelectItem>
                  <SelectItem value="dashed">Discontinua</SelectItem>
                  <SelectItem value="dotted">Punteada</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Heredar color del texto</Label>
              <Switch
                checked={config.dividerColor.trim() === ""}
                onCheckedChange={(on) =>
                  updateConfig({ dividerColor: on ? "" : (config.textColor || "#ffffff") })
                }
              />
            </div>
            {config.dividerColor.trim() !== "" && (
              <Field label="Color del separador">
                <ColorInput
                  value={config.dividerColor}
                  onChange={(v) => updateConfig({ dividerColor: v })}
                />
              </Field>
            )}
          </Section>

          {/* IMAGES */}
          <Section title="Imágenes" icon={ImageIcon}>
            <Field label="Ancho del logo" hint={`${config.imageWidth}%`}>
              <Slider
                value={[config.imageWidth]}
                onValueChange={(v) => updateConfig({ imageWidth: v[0] })}
                min={0}
                max={100}
                step={1}
              />
            </Field>
          </Section>

          {/* MODE-SPECIFIC */}
          {config.mode === "scroll" ? (
            <Section title="Animación de scroll" icon={Gauge}>
              <Field label="Velocidad" hint={`${config.scrollSpeed} px/s`}>
                <Slider
                  value={[config.scrollSpeed]}
                  onValueChange={(v) => updateConfig({ scrollSpeed: v[0] })}
                  min={10}
                  max={300}
                  step={5}
                />
              </Field>
              <Field label="Dirección">
                <ToggleGroup
                  type="single"
                  value={config.scrollDirection}
                  onValueChange={(v) => v && updateConfig({ scrollDirection: v as "up" | "down" })}
                  className="justify-start"
                >
                  <ToggleGroupItem value="up">
                    <ArrowUp className="h-4 w-4 mr-1" /> Hacia arriba
                  </ToggleGroupItem>
                  <ToggleGroupItem value="down">
                    <ArrowDown className="h-4 w-4 mr-1" /> Hacia abajo
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
              <Field label="Pausa final antes de reiniciar" hint={`${config.endPause}s`}>
                <Slider
                  value={[config.endPause]}
                  onValueChange={(v) => updateConfig({ endPause: v[0] })}
                  min={0}
                  max={20}
                  step={0.5}
                />
              </Field>
              <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                La duración total se calcula automáticamente según el contenido y la velocidad.
              </div>
            </Section>
          ) : (
            <Section title="Animación de aparición" icon={Sparkles}>
              <Field label="Tipo de animación">
                <Select
                  value={config.animationType}
                  onValueChange={(v) => updateConfig({ animationType: v as AnimationType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANIMATIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Duración de la animación" hint={`${config.animationDuration}s`}>
                <Slider
                  value={[config.animationDuration]}
                  onValueChange={(v) => updateConfig({ animationDuration: v[0] })}
                  min={0.2}
                  max={5}
                  step={0.1}
                />
              </Field>
              <Field label="Pausa entre items" hint={`${config.pauseDuration}s`}>
                <Slider
                  value={[config.pauseDuration]}
                  onValueChange={(v) => updateConfig({ pauseDuration: v[0] })}
                  min={0}
                  max={10}
                  step={0.1}
                />
              </Field>
              {config.animationType.startsWith("slide") && (
                <Field label="Distancia de deslizamiento" hint={`${config.animSlideDistance}px`}>
                  <Slider
                    value={[config.animSlideDistance]}
                    onValueChange={(v) => updateConfig({ animSlideDistance: v[0] })}
                    min={10}
                    max={300}
                    step={5}
                  />
                </Field>
              )}
              {config.animationType === "blur" && (
                <Field label="Intensidad del desenfoque" hint={`${config.animBlurAmount}px`}>
                  <Slider
                    value={[config.animBlurAmount]}
                    onValueChange={(v) => updateConfig({ animBlurAmount: v[0] })}
                    min={0}
                    max={60}
                    step={1}
                  />
                </Field>
              )}
              {config.animationType === "zoom" && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Escala inicial" hint={`${config.animZoomFrom}×`}>
                    <Slider
                      value={[config.animZoomFrom]}
                      onValueChange={(v) => updateConfig({ animZoomFrom: v[0] })}
                      min={0.1}
                      max={1}
                      step={0.05}
                    />
                  </Field>
                  <Field label="Escala de salida" hint={`${config.animZoomTo}×`}>
                    <Slider
                      value={[config.animZoomTo]}
                      onValueChange={(v) => updateConfig({ animZoomTo: v[0] })}
                      min={1}
                      max={3}
                      step={0.05}
                    />
                  </Field>
                </div>
              )}
              {config.animationType === "typewriter" && (
                <Field label="Velocidad de tecleo" hint={`${config.typewriterSpeed}ms/carácter`}>
                  <Slider
                    value={[config.typewriterSpeed]}
                    onValueChange={(v) => updateConfig({ typewriterSpeed: v[0] })}
                    min={10}
                    max={200}
                    step={5}
                  />
                </Field>
              )}
              {config.animationType !== "typewriter" && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Revelar línea a línea</Label>
                    <Switch
                      checked={config.staggerLines}
                      onCheckedChange={(v) => updateConfig({ staggerLines: v })}
                    />
                  </div>
                  {config.staggerLines && (
                    <Field label="Intervalo entre líneas" hint={`${config.lineRevealInterval}s/línea`}>
                      <Slider
                        value={[config.lineRevealInterval]}
                        onValueChange={(v) => updateConfig({ lineRevealInterval: v[0] })}
                        min={0.1}
                        max={3}
                        step={0.1}
                      />
                    </Field>
                  )}
                </>
              )}
            </Section>
          )}
        </div>
      </ScrollArea>
  )
}

// Quick presets the user can apply
export function PresetBar() {
  const { updateConfig, userPresets, saveUserPreset, deleteUserPreset, applyUserPreset } =
    useCreditStore()
  const [saveOpen, setSaveOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const trimmed = name.trim()
  const nameTaken = userPresets.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())
  const canSave = trimmed.length > 0 && !nameTaken
  const handleSave = () => {
    if (!canSave) return
    saveUserPreset(trimmed)
    setName("")
    setSaveOpen(false)
  }
  const presets: { name: string; patch: Partial<CreditConfig> }[] = [
    {
      name: "Cine clásico",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Playfair Display', serif",
        textColor: "#f5e6c8",
        backgroundColor: "#000000",
        fontSize: 80,
      },
    },
    {
      name: "Moderno minimal",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Inter', sans-serif",
        textColor: "#ffffff",
        backgroundColor: "#0a0a0a",
        useGradient: true,
        gradientFrom: "#0a0a0a",
        gradientTo: "#1f1f1f",
        fontSize: 64,
        fontWeight: 300,
        letterSpacing: 2,
      },
    },
    {
      name: "Cine épico",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Cinzel', serif",
        textColor: "#d4af37",
        backgroundColor: "#000000",
        useTextShadow: true,
        textShadowColor: "#d4af37",
        textShadowBlur: 20,
        fontSize: 88,
        fontWeight: 700,
      },
    },
    {
      name: "Neón retro",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Bebas Neue', sans-serif",
        textColor: "#ff00ff",
        backgroundColor: "#000000",
        useTextShadow: true,
        textShadowColor: "#ff00ff",
        textShadowBlur: 25,
        textShadowX: 0,
        textShadowY: 0,
        fontSize: 96,
        letterSpacing: 4,
      },
    },
    {
      name: "Documental",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Roboto', sans-serif",
        textColor: "#e8e8e8",
        backgroundColor: "#1a1a1a",
        useGradient: false,
        useTextShadow: false,
        fontSize: 56,
        fontWeight: 500,
      },
    },
    {
      name: "Elegante caligráfico",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Dancing Script', cursive",
        textColor: "#f5e6c8",
        backgroundColor: "#000000",
        useTextShadow: true,
        textShadowColor: "#000000",
        textShadowBlur: 15,
        fontSize: 100,
        fontWeight: 600,
      },
    },
  ]

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <Wand2 className="h-3.5 w-3.5" />
            Presets
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {presets.map((p) => (
            <DropdownMenuItem key={p.name} onSelect={() => updateConfig(p.patch)}>
              {p.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Bookmark className="h-3 w-3" />
            Mis presets
          </div>
          {userPresets.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Sin presets guardados</div>
          ) : (
            userPresets.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onSelect={() => applyUserPreset(p.id)}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{p.name}</span>
                <button
                  type="button"
                  aria-label={`Borrar ${p.name}`}
                  className="shrink-0 rounded p-0.5 hover:bg-destructive/20"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteUserPreset(p.id)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setSaveOpen(true)
            }}
          >
            Guardar actual…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={saveOpen}
        onOpenChange={(o) => {
          setSaveOpen(o)
          if (!o) setName("")
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guardar preset</DialogTitle>
            <DialogDescription>
              Guarda la configuración actual como un preset reutilizable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del preset"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave()
              }}
            />
            {nameTaken && (
              <p className="text-xs text-destructive">Ya existe un preset con ese nombre</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
