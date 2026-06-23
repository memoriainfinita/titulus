"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import {
  CreditItem,
  CreditItemType,
  CreditConfig,
  DEFAULT_CONFIG,
  DEFAULT_ITEMS,
  FontItem,
  Alignment,
} from "./types"

interface CreditState {
  // Data
  items: CreditItem[]
  config: CreditConfig
  fonts: FontItem[]
  selectedItemId: string | null
  projectName: string

  // UI state (not persisted)
  isPlaying: boolean
  isFullscreen: boolean
  previewKey: number // bump to force preview remount

  // Actions
  addItem: (type: CreditItemType, text?: string, index?: number) => void
  updateItem: (id: string, patch: Partial<CreditItem>) => void
  removeItem: (id: string) => void
  duplicateItem: (id: string) => void
  moveItem: (id: string, direction: "up" | "down") => void
  reorderItems: (fromId: string, toId: string) => void
  selectItem: (id: string | null) => void
  clearItems: () => void
  loadItems: (items: CreditItem[]) => void

  updateConfig: (patch: Partial<CreditConfig>) => void
  resetConfig: () => void

  addFont: (font: FontItem) => void
  removeFont: (id: string) => void
  updateFont: (id: string, patch: Partial<FontItem>) => void

  setPlaying: (playing: boolean) => void
  setFullscreen: (fs: boolean) => void
  restartPreview: () => void
  setProjectName: (name: string) => void

  // Export / Import
  exportProject: () => string
  importProject: (json: string) => boolean
}

const DEFAULT_FONTS: FontItem[] = [
  {
    id: "font-inter",
    name: "Inter",
    source: "google",
    family: "'Inter', sans-serif",
    category: "sans-serif",
    weights: ["300", "400", "500", "600", "700", "800", "900"],
  },
  {
    id: "font-roboto",
    name: "Roboto",
    source: "google",
    family: "'Roboto', sans-serif",
    category: "sans-serif",
    weights: ["100", "300", "400", "500", "700", "900"],
  },
  {
    id: "font-playfair",
    name: "Playfair Display",
    source: "google",
    family: "'Playfair Display', serif",
    category: "serif",
    weights: ["400", "500", "600", "700", "800", "900"],
  },
  {
    id: "font-montserrat",
    name: "Montserrat",
    source: "google",
    family: "'Montserrat', sans-serif",
    category: "sans-serif",
    weights: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  },
  {
    id: "font-cinzel",
    name: "Cinzel",
    source: "google",
    family: "'Cinzel', serif",
    category: "serif",
    weights: ["400", "500", "600", "700", "800", "900"],
  },
  {
    id: "font-bebas",
    name: "Bebas Neue",
    source: "google",
    family: "'Bebas Neue', sans-serif",
    category: "display",
    weights: ["400"],
  },
  {
    id: "font-oswald",
    name: "Oswald",
    source: "google",
    family: "'Oswald', sans-serif",
    category: "sans-serif",
    weights: ["200", "300", "400", "500", "600", "700"],
  },
  {
    id: "font-cormorant",
    name: "Cormorant Garamond",
    source: "google",
    family: "'Cormorant Garamond', serif",
    category: "serif",
    weights: ["300", "400", "500", "600", "700"],
  },
  {
    id: "font-dancing",
    name: "Dancing Script",
    source: "google",
    family: "'Dancing Script', cursive",
    category: "handwriting",
    weights: ["400", "500", "600", "700"],
  },
  {
    id: "font-abril",
    name: "Abril Fatface",
    source: "google",
    family: "'Abril Fatface', display",
    category: "display",
    weights: ["400"],
  },
]

export const useCreditStore = create<CreditState>()(
  persist(
    (set, get) => ({
      items: DEFAULT_ITEMS,
      config: DEFAULT_CONFIG,
      fonts: DEFAULT_FONTS,
      selectedItemId: null,
      projectName: "Mi Proyecto de Créditos",

      isPlaying: false,
      isFullscreen: false,
      previewKey: 0,

      addItem: (type, text = "", index) => {
        const newItem: CreditItem = {
          id: uuid(),
          type,
          text:
            text ??
            (type === "title"
              ? "Nuevo título"
              : type === "subtitle"
                ? "Nuevo subtítulo"
                : type === "name"
                  ? "Nombre Apellido"
                  : type === "role"
                    ? "Cargo"
                    : type === "description"
                      ? "Descripción del rol o detalle"
                      : ""),
        }
        set((state) => {
          if (index === undefined) {
            return { items: [...state.items, newItem], selectedItemId: newItem.id }
          }
          const newItems = [...state.items]
          newItems.splice(index, 0, newItem)
          return { items: newItems, selectedItemId: newItem.id }
        })
      },

      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          selectedItemId: state.selectedItemId === id ? null : state.selectedItemId,
        })),

      duplicateItem: (id) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.id === id)
          if (idx === -1) return state
          const original = state.items[idx]
          const copy: CreditItem = { ...original, id: uuid() }
          const newItems = [...state.items]
          newItems.splice(idx + 1, 0, copy)
          return { items: newItems, selectedItemId: copy.id }
        }),

      moveItem: (id, direction) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.id === id)
          if (idx === -1) return state
          const targetIdx = direction === "up" ? idx - 1 : idx + 1
          if (targetIdx < 0 || targetIdx >= state.items.length) return state
          const newItems = [...state.items]
          ;[newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]]
          return { items: newItems }
        }),

      reorderItems: (fromId, toId) =>
        set((state) => {
          const fromIdx = state.items.findIndex((i) => i.id === fromId)
          const toIdx = state.items.findIndex((i) => i.id === toId)
          if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return state
          const newItems = [...state.items]
          const [moved] = newItems.splice(fromIdx, 1)
          newItems.splice(toIdx, 0, moved)
          return { items: newItems }
        }),

      selectItem: (id) => set({ selectedItemId: id }),

      clearItems: () => set({ items: [], selectedItemId: null }),

      loadItems: (items) => set({ items, selectedItemId: null }),

      updateConfig: (patch) =>
        set((state) => ({ config: { ...state.config, ...patch } })),

      resetConfig: () => set({ config: DEFAULT_CONFIG }),

      addFont: (font) => set((state) => ({ fonts: [...state.fonts, font] })),

      removeFont: (id) =>
        set((state) => ({ fonts: state.fonts.filter((f) => f.id !== id) })),

      updateFont: (id, patch) =>
        set((state) => ({
          fonts: state.fonts.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      setPlaying: (isPlaying) => set({ isPlaying }),
      setFullscreen: (isFullscreen) => set({ isFullscreen }),
      restartPreview: () => set((state) => ({ previewKey: state.previewKey + 1, isPlaying: true })),
      setProjectName: (projectName) => set({ projectName }),

      exportProject: () => {
        const { items, config, fonts, projectName } = get()
        return JSON.stringify(
          { version: 1, projectName, items, config, fonts },
          null,
          2,
        )
      },

      importProject: (json) => {
        try {
          const parsed = JSON.parse(json)
          if (!parsed.items || !parsed.config) return false
          set({
            items: parsed.items,
            config: { ...DEFAULT_CONFIG, ...parsed.config },
            fonts: parsed.fonts || DEFAULT_FONTS,
            projectName: parsed.projectName || "Proyecto importado",
            selectedItemId: null,
          })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      name: "credit-titles-store",
      // Don't persist runtime UI state
      partialize: (state) => ({
        items: state.items,
        config: state.config,
        fonts: state.fonts,
        projectName: state.projectName,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CreditState>
        return { ...current, ...p, config: mergePersistedConfig(p.config) }
      },
    },
  ),
)

// Helper to get font size for a given credit item type
export function getFontSize(type: CreditItemType, config: CreditConfig): number {
  switch (type) {
    case "title":
      return config.fontSizeTitle
    case "subtitle":
      return config.fontSizeSubtitle
    case "name":
      return config.fontSizeName
    case "role":
      return config.fontSizeRole
    case "description":
      return config.fontSizeDescription
    default:
      return config.fontSizeDescription
  }
}

// Helper to get font weight for a given credit item type
export function getFontWeight(type: CreditItemType, baseWeight: number): number {
  switch (type) {
    case "title":
      return Math.min(900, baseWeight + 200)
    case "subtitle":
      return Math.min(900, baseWeight + 100)
    case "name":
      return Math.min(900, baseWeight + 100)
    case "role":
      return Math.max(100, baseWeight - 100)
    case "description":
      return baseWeight
    default:
      return baseWeight
  }
}

// Resolve alignment for an item
export function resolveAlignment(item: CreditItem, config: CreditConfig): Alignment {
  return item.align ?? config.alignment
}

// Merge a persisted (possibly older) config over the current defaults, so
// config keys added after a user's state was first saved are backfilled.
export function mergePersistedConfig(
  persistedConfig: Partial<CreditConfig> | undefined,
): CreditConfig {
  return { ...DEFAULT_CONFIG, ...(persistedConfig ?? {}) }
}
