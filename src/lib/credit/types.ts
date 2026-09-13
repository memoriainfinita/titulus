// Type definitions for the credit titles generator

export type CreditItemType = "text" | "spacer" | "divider" | "image" | "overlay"

export type Alignment = "left" | "center" | "right"

export type BackgroundImageFit = "cover" | "contain"

export type OverlayLayer = "front" | "back"

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

export type DividerStyle = "solid" | "dashed" | "dotted"

// Rich text model: an item's text as lines of styled runs.
// A run without style inherits the global config (font, size, color).
export interface RichStyle {
  fontFamily?: string
  fontSize?: number // px
  bold?: boolean // renders weight 700 over config.fontWeight
  italic?: boolean
  color?: string
}

export interface RichRun {
  text: string
  style?: RichStyle
}

export type RichLine = RichRun[]
export type Rich = RichLine[]

export interface CreditItem {
  id: string
  type: CreditItemType
  text: string
  // Rich text (lines -> styled runs). When present, scenes render it instead of
  // `text`; `text` is kept in sync (derived) for durations, list rows, typewriter length.
  rich?: Rich
  align?: Alignment // override global alignment
  uppercase?: boolean
  // Appearing mode only: overrides config.pauseDuration (hold time) for this item.
  // undefined = inherit the global pause. Negative values are ignored.
  pauseOverride?: number
  // Text blur (px). undefined = inherit config.textBlur. Negative values are ignored.
  textBlur?: number
  // Text shadow overrides. undefined = inherit the global counterpart.
  useTextShadow?: boolean // tri-state: undefined = inherit, true = force on, false = force off
  textShadowColor?: string // empty/undefined = inherit config.textShadowColor
  textShadowBlur?: number // px; undefined = inherit (0 allowed)
  textShadowX?: number // px; undefined = inherit (0 and negatives allowed)
  textShadowY?: number // px; undefined = inherit (0 and negatives allowed)
  textShadowOpacity?: number // 0-1; undefined = inherit
  // Typewriter speed (ms per character, appearing mode). undefined/<=0 = inherit config.typewriterSpeed.
  typewriterSpeed?: number
  // Reveal the item's text line by line (appearing mode), staggering each line by lineRevealInterval.
  // Each line enters with the item's resolved animationType. Tri-state: undefined = inherit, true/false = override.
  staggerLines?: boolean
  // Line-by-line reveal interval (seconds per line). undefined/<=0 = inherit config.lineRevealInterval.
  lineRevealInterval?: number
  // Spacer override: alto en px. undefined = hereda config.spacerHeight.
  spacerHeight?: number
  // Divider overrides. undefined = hereda el config.divider* correspondiente.
  dividerThickness?: number // px
  dividerWidth?: number // % del ancho del escenario
  dividerOpacity?: number // 0-1
  dividerStyle?: DividerStyle
  dividerColor?: string // vacío/undefined = hereda config.textColor
  // Text overrides. undefined = hereda el global correspondiente.
  // (fuente, tamaño, negrita, cursiva y color viven en los runs de `rich`.)
  letterSpacing?: number // px; admite 0 y negativos
  lineHeight?: number // <= 0 se ignora
  // Animation overrides (modo aparición). undefined = hereda el config.* correspondiente.
  animationType?: AnimationType
  animationDuration?: number // s; <= 0 se ignora
  animSlideDistance?: number // px; admite 0 y negativos
  animBlurAmount?: number // px; admite 0
  animZoomFrom?: number
  animZoomTo?: number
  // Image (logo) item.
  imageSrc?: string // data URL
  imageWidth?: number // % del ancho del escenario; undefined = hereda config.imageWidth
  // Overlay item (scroll mode): fixed image shown when its list position reaches
  // the stage center. Reuses imageSrc/imageWidth. undefined = OVERLAY_DEFAULTS.
  overlayX?: number // % del ancho del escenario, centro de la imagen
  overlayY?: number // % del alto del escenario, centro de la imagen
  overlayDuration?: number // s visible, fundidos incluidos; <= 0 se ignora
  overlayFade?: number // s de fundido de entrada y de salida; < 0 se ignora
  overlayLayer?: OverlayLayer // front = sobre texto y viñeta; back = bajo el texto, sobre el fondo
  // Wrap overrides. undefined = hereda el global correspondiente.
  noWrap?: boolean
  textBoxWidth?: number // % del ancho del escenario; <= 0 se ignora
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

export interface UserPreset {
  id: string
  name: string
  config: CreditConfig // full snapshot of config at save time
  createdAt: number
}

export interface CreditConfig {
  mode: CreditMode
  // Typography
  fontFamily: string
  fontWeight: number
  fontSize: number // px, base size for runs without a fontSize override
  letterSpacing: number
  lineHeight: number
  // Colors
  textColor: string
  backgroundColor: string
  useGradient: boolean
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  backgroundImage: string // data URL; empty = no image
  backgroundImageFit: BackgroundImageFit
  backgroundImageDim: number // 0-1 black overlay over the image
  // Layout
  alignment: Alignment
  itemSpacing: number
  paddingX: number
  noWrap: boolean // true = whiteSpace pre (no envuelve automático)
  textBoxWidth: number // max-width de la caja de texto, % del escenario; 100 = sin límite
  // Spacer / Divider
  spacerHeight: number
  dividerThickness: number
  dividerWidth: number // percent
  dividerOpacity: number // 0-1
  dividerStyle: DividerStyle
  dividerColor: string // empty = inherit textColor
  imageWidth: number // percent of stage width
  // Effects
  useTextShadow: boolean
  textShadowColor: string
  textShadowBlur: number
  textShadowX: number
  textShadowY: number
  textShadowOpacity: number // 0-1
  textBlur: number // px blur applied to text (global default)
  // Vignette (top/bottom fades), shared by both modes
  vignetteEnabled: boolean
  vignetteHeight: number // percent of stage height
  // Scroll mode
  scrollSpeed: number // px per second
  scrollDirection: "up" | "down"
  endPause: number
  // Appearing mode
  animationType: AnimationType
  animationDuration: number // seconds
  pauseDuration: number // seconds between items
  loop: boolean
  typewriterSpeed: number // ms per character for the typewriter animation
  staggerLines: boolean // reveal item text line by line (appearing mode)
  lineRevealInterval: number // seconds per line for the line-by-line reveal
  // Appearing animation tunables
  animSlideDistance: number // px traveled by slide-* variants
  animBlurAmount: number // px blur for the blur variant
  animZoomFrom: number // initial scale for zoom variant
  animZoomTo: number // exit scale for zoom variant
  // Stage
  stageWidth: number // 16, 21, 9, etc.
  stageHeight: number
  stageRatio: "16:9" | "21:9" | "4:3" | "9:16" | "1:1"
  // Preview guides (never exported into the video)
  showSafeMargins: boolean // title-safe / action-safe overlay in the editor preview
  respectSafeMargins: boolean // constriñe el contenido a la caja título-segura; SÍ afecta al export
}

export const DEFAULT_CONFIG: CreditConfig = {
  mode: "scroll",
  fontFamily: "'Inter', sans-serif",
  fontWeight: 400,
  fontSize: 36,
  letterSpacing: 0,
  lineHeight: 1.4,
  textColor: "#ffffff",
  backgroundColor: "#000000",
  useGradient: false,
  gradientFrom: "#000000",
  gradientTo: "#1a1a2e",
  gradientAngle: 180,
  backgroundImage: "",
  backgroundImageFit: "cover",
  backgroundImageDim: 0,
  alignment: "center",
  itemSpacing: 24,
  paddingX: 80,
  noWrap: false,
  textBoxWidth: 100,
  spacerHeight: 48,
  dividerThickness: 1,
  dividerWidth: 60,
  dividerOpacity: 0.4,
  dividerStyle: "solid",
  dividerColor: "",
  imageWidth: 40,
  useTextShadow: true,
  textShadowColor: "#000000",
  textShadowBlur: 12,
  textShadowX: 0,
  textShadowY: 2,
  textShadowOpacity: 1,
  textBlur: 0,
  vignetteEnabled: true,
  vignetteHeight: 20,
  scrollSpeed: 60,
  scrollDirection: "up",
  endPause: 3,
  animationType: "fade",
  animationDuration: 1.5,
  pauseDuration: 1.5,
  loop: true,
  typewriterSpeed: 50,
  staggerLines: false,
  lineRevealInterval: 0.4,
  animSlideDistance: 80,
  animBlurAmount: 20,
  animZoomFrom: 0.6,
  animZoomTo: 1.4,
  stageWidth: 1280,
  stageHeight: 720,
  stageRatio: "16:9",
  showSafeMargins: false,
  respectSafeMargins: false,
}

export const CREDIT_TYPE_LABELS: Record<CreditItemType, string> = {
  text: "Texto",
  spacer: "Espacio",
  divider: "Separador",
  image: "Logo / Imagen",
  overlay: "Imagen fija",
}

export const CREDIT_TYPE_ICONS: Record<CreditItemType, string> = {
  text: "Type",
  spacer: "Space",
  divider: "Minus",
  image: "Image",
  overlay: "Layers",
}

// Default sample credits so the app looks good on first load
export const DEFAULT_ITEMS: CreditItem[] = [
  { id: "demo-1", type: "text", text: "Mi Película Increíble", rich: [[{ text: "Mi Película Increíble", style: { fontSize: 72, bold: true } }]] },
  { id: "demo-2", type: "text", text: "Una historia de aventuras", rich: [[{ text: "Una historia de aventuras", style: { fontSize: 42, italic: true } }]] },
  { id: "demo-3", type: "spacer", text: "" },
  { id: "demo-4", type: "text", text: "Juan Pérez\nDirector", rich: [[{ text: "Juan Pérez" }], [{ text: "Director", style: { fontSize: 24, italic: true, color: "#c9c9c9" } }]] },
  { id: "demo-5", type: "spacer", text: "" },
  { id: "demo-6", type: "text", text: "María González\nProductora Ejecutiva", rich: [[{ text: "María González" }], [{ text: "Productora Ejecutiva", style: { fontSize: 24, italic: true, color: "#c9c9c9" } }]] },
  { id: "demo-7", type: "spacer", text: "" },
  { id: "demo-8", type: "divider", text: "" },
  { id: "demo-9", type: "spacer", text: "" },
  { id: "demo-10", type: "text", text: "Reparto", rich: [[{ text: "Reparto", style: { fontSize: 56, bold: true } }]] },
  { id: "demo-11", type: "spacer", text: "" },
  { id: "demo-12", type: "text", text: "Carlos Ruiz como Alejandro", rich: [[{ text: "Carlos Ruiz", style: { bold: true } }, { text: " como " }, { text: "Alejandro", style: { italic: true } }]] },
  { id: "demo-13", type: "text", text: "Ana Torres como Isabella", rich: [[{ text: "Ana Torres", style: { bold: true } }, { text: " como " }, { text: "Isabella", style: { italic: true } }]] },
  { id: "demo-14", type: "spacer", text: "" },
  { id: "demo-15", type: "text", text: "GRACIAS", rich: [[{ text: "GRACIAS", style: { fontSize: 72, bold: true } }]] },
  { id: "demo-16", type: "text", text: "Por ver esta película", rich: [[{ text: "Por ver esta película", style: { fontSize: 20 } }]] },
]
