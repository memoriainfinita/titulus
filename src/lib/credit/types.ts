// Type definitions for the credit titles generator

export type CreditItemType =
  | "title"
  | "subtitle"
  | "name"
  | "role"
  | "description"
  | "spacer"
  | "divider"

export type Alignment = "left" | "center" | "right"

export type CreditMode = "scroll" | "appearing"

export type AnimationType =
  | "fade"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "zoom"
  | "blur"
  | "typewriter"

export interface CreditItem {
  id: string
  type: CreditItemType
  text: string
  align?: Alignment // override global alignment
  bold?: boolean
  italic?: boolean
  uppercase?: boolean
  // Appearing mode only: overrides config.pauseDuration (hold time) for this item.
  // undefined = inherit the global pause. Negative values are ignored.
  pauseOverride?: number
}

export interface FontItem {
  id: string
  name: string
  source: "google" | "custom" | "system"
  family: string // CSS font-family value
  url?: string // for custom fonts (data URL or external URL)
  category?: string
  weights?: string[]
}

export interface CreditConfig {
  mode: CreditMode
  // Typography
  fontFamily: string
  fontWeight: number
  fontSizeTitle: number
  fontSizeSubtitle: number
  fontSizeName: number
  fontSizeRole: number
  fontSizeDescription: number
  letterSpacing: number
  lineHeight: number
  // Colors
  textColor: string
  backgroundColor: string
  useGradient: boolean
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  // Layout
  alignment: Alignment
  itemSpacing: number
  paddingX: number
  // Effects
  textShadow: string
  useTextShadow: boolean
  textShadowColor: string
  textShadowBlur: number
  textShadowX: number
  textShadowY: number
  // Scroll mode
  scrollSpeed: number // px per second
  scrollDirection: "up" | "down"
  startDelay: number
  endPause: number
  // Appearing mode
  animationType: AnimationType
  animationDuration: number // seconds
  pauseDuration: number // seconds between items
  loop: boolean
  showAllAtOnce: boolean
  // Stage
  stageWidth: number // 16, 21, 9, etc.
  stageHeight: number
  stageRatio: "16:9" | "21:9" | "4:3" | "9:16" | "1:1"
}

export interface CreditProject {
  id: string
  name: string
  items: CreditItem[]
  config: CreditConfig
  createdAt: number
  updatedAt: number
}

export const DEFAULT_CONFIG: CreditConfig = {
  mode: "scroll",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 400,
  fontSizeTitle: 72,
  fontSizeSubtitle: 42,
  fontSizeName: 36,
  fontSizeRole: 24,
  fontSizeDescription: 20,
  letterSpacing: 0,
  lineHeight: 1.4,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  useGradient: false,
  gradientFrom: "#000000",
  gradientTo: "#1a1a2e",
  gradientAngle: 180,
  alignment: "center",
  itemSpacing: 24,
  paddingX: 80,
  textShadow: "0 2px 12px rgba(0,0,0,0.6)",
  useTextShadow: true,
  textShadowColor: "#000000",
  textShadowBlur: 12,
  textShadowX: 0,
  textShadowY: 2,
  scrollSpeed: 60,
  scrollDirection: "up",
  startDelay: 1,
  endPause: 3,
  animationType: "fade",
  animationDuration: 1.5,
  pauseDuration: 1.5,
  loop: true,
  showAllAtOnce: false,
  stageWidth: 1280,
  stageHeight: 720,
  stageRatio: "16:9",
}

export const CREDIT_TYPE_LABELS: Record<CreditItemType, string> = {
  title: "Título principal",
  subtitle: "Subtítulo",
  name: "Nombre",
  role: "Rol / Cargo",
  description: "Descripción",
  spacer: "Espacio",
  divider: "Separador",
}

export const CREDIT_TYPE_ICONS: Record<CreditItemType, string> = {
  title: "Heading1",
  subtitle: "Heading2",
  name: "User",
  role: "Briefcase",
  description: "Text",
  spacer: "Space",
  divider: "Minus",
}

// Default sample credits so the app looks good on first load
export const DEFAULT_ITEMS: CreditItem[] = [
  { id: "demo-1", type: "title", text: "Mi Película Increíble" },
  { id: "demo-2", type: "subtitle", text: "Una historia de aventuras" },
  { id: "demo-3", type: "spacer", text: "" },
  { id: "demo-4", type: "name", text: "Juan Pérez" },
  { id: "demo-5", type: "role", text: "Director" },
  { id: "demo-6", type: "spacer", text: "" },
  { id: "demo-7", type: "name", text: "María González" },
  { id: "demo-8", type: "role", text: "Productora Ejecutiva" },
  { id: "demo-9", type: "spacer", text: "" },
  { id: "demo-10", type: "title", text: "Reparto Principal" },
  { id: "demo-11", type: "spacer", text: "" },
  { id: "demo-12", type: "name", text: "Carlos Ruiz" },
  { id: "demo-13", type: "role", text: "como Alejandro" },
  { id: "demo-14", type: "spacer", text: "" },
  { id: "demo-15", type: "name", text: "Ana Torres" },
  { id: "demo-16", type: "role", text: "como Isabella" },
  { id: "demo-17", type: "spacer", text: "" },
  { id: "demo-18", type: "divider", text: "" },
  { id: "demo-19", type: "spacer", text: "" },
  { id: "demo-20", type: "title", text: "Equipo Técnico" },
  { id: "demo-21", type: "spacer", text: "" },
  { id: "demo-22", type: "name", text: "Pedro Martín" },
  { id: "demo-23", type: "role", text: "Director de Fotografía" },
  { id: "demo-24", type: "spacer", text: "" },
  { id: "demo-25", type: "name", text: "Lucía Díaz" },
  { id: "demo-26", type: "role", text: "Diseño de Producción" },
  { id: "demo-27", type: "spacer", text: "" },
  { id: "demo-28", type: "name", text: "Miguel Ángel Serrano" },
  { id: "demo-29", type: "role", text: "Música Original" },
  { id: "demo-30", type: "spacer", text: "" },
  { id: "demo-31", type: "divider", text: "" },
  { id: "demo-32", type: "spacer", text: "" },
  { id: "demo-33", type: "title", text: "GRACIAS" },
  { id: "demo-34", type: "description", text: "Por ver esta película" },
]
