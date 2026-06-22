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
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { useCreditStore } from "@/lib/credit/store"
import { CreditConfig, AnimationType, CreditMode, Alignment } from "@/lib/credit/types"
import { DEFAULT_CONFIG } from "@/lib/credit/types"
import { FontManager } from "./FontManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"
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

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
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

export function ConfigPanel() {
  const { config, updateConfig, resetConfig, fonts } = useCreditStore()

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Configuración
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => {
            if (confirm("¿Restablecer toda la configuración?")) resetConfig()
          }}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Reset
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div>
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
            <Field label="Tamaño: Título" hint={`${config.fontSizeTitle}px`}>
              <Slider
                value={[config.fontSizeTitle]}
                onValueChange={(v) => updateConfig({ fontSizeTitle: v[0] })}
                min={16}
                max={200}
                step={1}
              />
            </Field>
            <Field label="Tamaño: Subtítulo" hint={`${config.fontSizeSubtitle}px`}>
              <Slider
                value={[config.fontSizeSubtitle]}
                onValueChange={(v) => updateConfig({ fontSizeSubtitle: v[0] })}
                min={12}
                max={150}
                step={1}
              />
            </Field>
            <Field label="Tamaño: Nombre" hint={`${config.fontSizeName}px`}>
              <Slider
                value={[config.fontSizeName]}
                onValueChange={(v) => updateConfig({ fontSizeName: v[0] })}
                min={12}
                max={150}
                step={1}
              />
            </Field>
            <Field label="Tamaño: Rol" hint={`${config.fontSizeRole}px`}>
              <Slider
                value={[config.fontSizeRole]}
                onValueChange={(v) => updateConfig({ fontSizeRole: v[0] })}
                min={10}
                max={120}
                step={1}
              />
            </Field>
            <Field label="Tamaño: Descripción" hint={`${config.fontSizeDescription}px`}>
              <Slider
                value={[config.fontSizeDescription]}
                onValueChange={(v) => updateConfig({ fontSizeDescription: v[0] })}
                min={10}
                max={120}
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
          </Section>

          {/* COLORS */}
          <Section title="Colores y fondo" icon={Palette}>
            <Field label="Color del texto">
              <ColorInput
                value={config.textColor}
                onChange={(v) => updateConfig({ textColor: v })}
                label="Texto"
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
                    label="From"
                  />
                </Field>
                <Field label="Color final del degradado">
                  <ColorInput
                    value={config.gradientTo}
                    onChange={(v) => updateConfig({ gradientTo: v })}
                    label="To"
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
                  label="Fondo"
                />
              </Field>
            )}
            <Separator />
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
                    label="Sombra"
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
              </>
            )}
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
              <div className="flex items-center justify-between">
                <Label className="text-xs">Repetir en bucle</Label>
                <Switch
                  checked={config.loop}
                  onCheckedChange={(v) => updateConfig({ loop: v })}
                />
              </div>
              {config.animationType === "typewriter" && (
                <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded">
                  La velocidad de la máquina de escribir se ajusta automáticamente
                  según la longitud del texto (~50ms por carácter).
                </div>
              )}
            </Section>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Quick presets the user can apply
export function PresetBar() {
  const { updateConfig, config } = useCreditStore()
  const presets: { name: string; patch: Partial<CreditConfig> }[] = [
    {
      name: "Cine clásico",
      patch: {
        ...DEFAULT_CONFIG,
        fontFamily: "'Playfair Display', serif",
        textColor: "#f5e6c8",
        backgroundColor: "#000000",
        fontSizeTitle: 80,
        fontSizeSubtitle: 44,
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
        fontSizeTitle: 64,
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
        fontSizeTitle: 88,
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
        fontSizeTitle: 96,
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
        fontSizeTitle: 56,
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
        fontSizeTitle: 100,
        fontWeight: 600,
      },
    },
  ]

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {presets.map((p) => (
        <Button
          key={p.name}
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => updateConfig(p.patch)}
        >
          {p.name}
        </Button>
      ))}
    </div>
  )
}
