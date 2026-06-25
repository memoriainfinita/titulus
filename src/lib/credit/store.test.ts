import { describe, it, expect, beforeEach } from "vitest"
import {
  useCreditStore,
  getFontSize,
  getFontWeight,
  resolveAlignment,
  resolveFontWeight,
  mergePersistedConfig,
} from "./store"
import { CreditItem, CreditConfig, DEFAULT_CONFIG } from "./types"

const baseItems: CreditItem[] = [
  { id: "a", type: "title", text: "A" },
  { id: "b", type: "name", text: "B" },
  { id: "c", type: "role", text: "C" },
]

// Reset to a known state before each test (the store is a module singleton).
beforeEach(() => {
  useCreditStore.setState({
    items: baseItems.map((i) => ({ ...i })),
    config: { ...DEFAULT_CONFIG },
    selectedItemId: null,
    projectName: "Test",
  })
})

describe("getFontSize", () => {
  it("maps each credit type to its configured size", () => {
    expect(getFontSize("title", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeTitle)
    expect(getFontSize("subtitle", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeSubtitle)
    expect(getFontSize("name", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeName)
    expect(getFontSize("role", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeRole)
    expect(getFontSize("description", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeDescription)
  })

  it("falls back to the description size for spacer/divider", () => {
    expect(getFontSize("spacer", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeDescription)
    expect(getFontSize("divider", DEFAULT_CONFIG)).toBe(DEFAULT_CONFIG.fontSizeDescription)
  })
})

describe("getFontWeight", () => {
  it("boosts titles and clamps at 900", () => {
    expect(getFontWeight("title", 400)).toBe(600)
    expect(getFontWeight("title", 800)).toBe(900)
  })

  it("reduces roles and clamps at 100", () => {
    expect(getFontWeight("role", 400)).toBe(300)
    expect(getFontWeight("role", 100)).toBe(100)
  })

  it("leaves description at the base weight", () => {
    expect(getFontWeight("description", 500)).toBe(500)
  })
})

describe("setHasHydrated", () => {
  it("flips the hydration flag", () => {
    useCreditStore.getState().setHasHydrated(false)
    expect(useCreditStore.getState()._hasHydrated).toBe(false)
    useCreditStore.getState().setHasHydrated(true)
    expect(useCreditStore.getState()._hasHydrated).toBe(true)
  })
})

describe("resolveAlignment", () => {
  it("uses the item override when present", () => {
    const item: CreditItem = { id: "x", type: "name", text: "X", align: "left" }
    expect(resolveAlignment(item, { ...DEFAULT_CONFIG, alignment: "center" })).toBe("left")
  })

  it("falls back to the global alignment otherwise", () => {
    const item: CreditItem = { id: "x", type: "name", text: "X" }
    expect(resolveAlignment(item, { ...DEFAULT_CONFIG, alignment: "right" })).toBe("right")
  })
})

describe("store reducers", () => {
  it("addItem appends and selects the new item", () => {
    useCreditStore.getState().addItem("name", "Nuevo")
    const { items, selectedItemId } = useCreditStore.getState()
    expect(items).toHaveLength(4)
    expect(items[3].text).toBe("Nuevo")
    expect(selectedItemId).toBe(items[3].id)
  })

  it("addItem inserts at a given index", () => {
    useCreditStore.getState().addItem("name", "Insertado", 1)
    const { items } = useCreditStore.getState()
    expect(items[1].text).toBe("Insertado")
    expect(items.map((i) => i.id.length === 1 ? i.id : "new")).toEqual(["a", "new", "b", "c"])
  })

  it("removeItem deletes by id and clears its selection", () => {
    useCreditStore.setState({ selectedItemId: "b" })
    useCreditStore.getState().removeItem("b")
    const { items, selectedItemId } = useCreditStore.getState()
    expect(items.map((i) => i.id)).toEqual(["a", "c"])
    expect(selectedItemId).toBeNull()
  })

  it("duplicateItem inserts a copy with a new id right after the original", () => {
    useCreditStore.getState().duplicateItem("a")
    const { items } = useCreditStore.getState()
    expect(items).toHaveLength(4)
    expect(items[1].text).toBe("A")
    expect(items[1].id).not.toBe("a")
  })

  it("moveItem swaps with the neighbour in the given direction", () => {
    useCreditStore.getState().moveItem("b", "up")
    expect(useCreditStore.getState().items.map((i) => i.id)).toEqual(["b", "a", "c"])
  })

  it("moveItem is a no-op at the boundaries", () => {
    useCreditStore.getState().moveItem("a", "up")
    expect(useCreditStore.getState().items.map((i) => i.id)).toEqual(["a", "b", "c"])
    useCreditStore.getState().moveItem("c", "down")
    expect(useCreditStore.getState().items.map((i) => i.id)).toEqual(["a", "b", "c"])
  })

  it("reorderItems moves an item to another item's position", () => {
    useCreditStore.getState().reorderItems("a", "c")
    expect(useCreditStore.getState().items.map((i) => i.id)).toEqual(["b", "c", "a"])
  })
})

describe("project import/export", () => {
  it("round-trips items and config through export then import", () => {
    useCreditStore.getState().updateConfig({ scrollSpeed: 123 })
    const json = useCreditStore.getState().exportProject()

    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    const ok = useCreditStore.getState().importProject(json)

    expect(ok).toBe(true)
    expect(useCreditStore.getState().config.scrollSpeed).toBe(123)
    expect(useCreditStore.getState().items.map((i) => i.id)).toEqual(["a", "b", "c"])
  })

  it("preserves a per-item pauseOverride through export then import", () => {
    useCreditStore.setState({
      items: [
        { id: "a", type: "name", text: "A", pauseOverride: 4.5 },
        { id: "b", type: "name", text: "B" },
      ],
    })
    const json = useCreditStore.getState().exportProject()

    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const { items } = useCreditStore.getState()
    expect(items[0].pauseOverride).toBe(4.5)
    expect(items[1].pauseOverride).toBeUndefined()
  })

  it("preserves new spacer/divider item overrides through export then import", () => {
    useCreditStore.setState({
      items: [
        { id: "s", type: "spacer", text: "", spacerHeight: 120 },
        { id: "d", type: "divider", text: "", dividerThickness: 4, dividerWidth: 100, dividerOpacity: 0.8, dividerStyle: "dashed", dividerColor: "#ff0000" },
      ],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const { items } = useCreditStore.getState()
    expect(items[0].spacerHeight).toBe(120)
    expect(items[1].dividerStyle).toBe("dashed")
    expect(items[1].dividerColor).toBe("#ff0000")
  })

  it("rejects invalid JSON", () => {
    expect(useCreditStore.getState().importProject("{ not json")).toBe(false)
  })

  it("rejects JSON missing items or config", () => {
    expect(useCreditStore.getState().importProject(JSON.stringify({ foo: 1 }))).toBe(false)
  })

  it("backfills missing config keys from defaults on import", () => {
    const json = JSON.stringify({
      items: [{ id: "z", type: "title", text: "Z" }],
      config: { scrollSpeed: 99 },
    })
    expect(useCreditStore.getState().importProject(json)).toBe(true)
    const { config } = useCreditStore.getState()
    expect(config.scrollSpeed).toBe(99)
    expect(config.mode).toBe(DEFAULT_CONFIG.mode)
  })

  it("preserves per-item text overrides through export then import", () => {
    useCreditStore.setState({
      items: [
        { id: "a", type: "name", text: "A", fontSize: 50, color: "#ff0000", fontFamily: "'Roboto', sans-serif", letterSpacing: 3, lineHeight: 2 },
      ],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const it0 = useCreditStore.getState().items[0]
    expect(it0.fontSize).toBe(50)
    expect(it0.color).toBe("#ff0000")
    expect(it0.fontFamily).toBe("'Roboto', sans-serif")
    expect(it0.letterSpacing).toBe(3)
    expect(it0.lineHeight).toBe(2)
  })

  it("preserves image item fields and backfills imageWidth global", () => {
    useCreditStore.setState({
      items: [{ id: "img", type: "image", text: "", imageSrc: "data:image/png;base64,AAA", imageWidth: 80 }],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    useCreditStore.getState().importProject(json)

    const it0 = useCreditStore.getState().items[0]
    expect(it0.type).toBe("image")
    expect(it0.imageSrc).toBe("data:image/png;base64,AAA")
    expect(it0.imageWidth).toBe(80)
    expect(useCreditStore.getState().config.imageWidth).toBe(DEFAULT_CONFIG.imageWidth)
  })

  it("preserves new config keys and per-item wrap overrides through export then import", () => {
    useCreditStore.getState().updateConfig({ respectSafeMargins: true, noWrap: true, textBoxWidth: 70 })
    useCreditStore.setState({
      items: [{ id: "a", type: "name", text: "Ada", noWrap: true, textBoxWidth: 50 }],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    expect(useCreditStore.getState().importProject(json)).toBe(true)

    const { config, items } = useCreditStore.getState()
    expect(config.respectSafeMargins).toBe(true)
    expect(config.noWrap).toBe(true)
    expect(config.textBoxWidth).toBe(70)
    expect(items[0].noWrap).toBe(true)
    expect(items[0].textBoxWidth).toBe(50)
  })

  it("preserves per-item shadow and typewriter overrides through export then import", () => {
    useCreditStore.setState({
      items: [
        {
          id: "a",
          type: "name",
          text: "Ada",
          useTextShadow: false,
          textShadowColor: "#ff0000",
          textShadowBlur: 8,
          textShadowX: 3,
          textShadowY: -2,
          textShadowOpacity: 0.5,
          typewriterSpeed: 120,
        },
      ],
    })
    const json = useCreditStore.getState().exportProject()
    useCreditStore.setState({ items: [], config: { ...DEFAULT_CONFIG } })
    expect(useCreditStore.getState().importProject(json)).toBe(true)

    const it0 = useCreditStore.getState().items[0]
    expect(it0.useTextShadow).toBe(false)
    expect(it0.textShadowColor).toBe("#ff0000")
    expect(it0.textShadowBlur).toBe(8)
    expect(it0.textShadowX).toBe(3)
    expect(it0.textShadowY).toBe(-2)
    expect(it0.textShadowOpacity).toBe(0.5)
    expect(it0.typewriterSpeed).toBe(120)
  })
})

describe("seek/active channels and addItem placeholder", () => {
  function freshStore() {
    useCreditStore.setState({ items: [], selectedItemId: null, seekTarget: null, activeItemId: null })
  }

  it("addItem sin texto usa el placeholder del tipo y selecciona", () => {
    freshStore()
    useCreditStore.getState().addItem("title")
    const { items, selectedItemId } = useCreditStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].text).toBe("Nuevo título")
    expect(selectedItemId).toBe(items[0].id)
  })

  it("addItem con index inserta antes de esa posición", () => {
    freshStore()
    const s = useCreditStore.getState()
    s.addItem("name") // idx0
    s.addItem("role") // idx1
    const firstId = useCreditStore.getState().items[0].id
    useCreditStore.getState().addItem("subtitle", undefined, 1)
    const items = useCreditStore.getState().items
    expect(items.map((i) => i.type)).toEqual(["name", "subtitle", "role"])
    expect(items[0].id).toBe(firstId)
    expect(useCreditStore.getState().selectedItemId).toBe(items[1].id)
  })

  it("addItem con index 0 inserta al principio y con index=length al final", () => {
    freshStore()
    const s = useCreditStore.getState()
    s.addItem("name")
    s.addItem("name", undefined, 0)
    s.addItem("role", undefined, useCreditStore.getState().items.length)
    expect(useCreditStore.getState().items.map((i) => i.type)).toEqual(["name", "name", "role"])
  })

  it("requestSeek fija id e incrementa nonce", () => {
    freshStore()
    useCreditStore.getState().requestSeek("abc")
    expect(useCreditStore.getState().seekTarget).toEqual({ id: "abc", nonce: 1 })
    useCreditStore.getState().requestSeek("abc")
    expect(useCreditStore.getState().seekTarget).toEqual({ id: "abc", nonce: 2 })
  })

  it("setActiveItem no crea objeto nuevo si no cambia", () => {
    freshStore()
    useCreditStore.getState().setActiveItem("x")
    const before = useCreditStore.getState()
    useCreditStore.getState().setActiveItem("x")
    expect(useCreditStore.getState()).toBe(before)
  })
})

describe("mergePersistedConfig", () => {
  it("backfills missing keys from DEFAULT_CONFIG", () => {
    const merged = mergePersistedConfig({ scrollSpeed: 99 } as Partial<typeof DEFAULT_CONFIG>)
    expect(merged.scrollSpeed).toBe(99)
    expect(merged.spacerHeight).toBe(DEFAULT_CONFIG.spacerHeight)
    expect(merged.dividerStyle).toBe(DEFAULT_CONFIG.dividerStyle)
    expect(merged.dividerColor).toBe(DEFAULT_CONFIG.dividerColor)
  })

  it("backfills timeline/wrap/safe-margin keys for older persisted state", () => {
    const merged = mergePersistedConfig({ paddingX: 40 } as Partial<typeof DEFAULT_CONFIG>)
    expect(merged.paddingX).toBe(40)
    expect(merged.respectSafeMargins).toBe(false)
    expect(merged.noWrap).toBe(false)
    expect(merged.textBoxWidth).toBe(100)
  })

  it("returns full defaults when given undefined", () => {
    expect(mergePersistedConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })
})

describe("resolveFontWeight", () => {
  const cfg: CreditConfig = { ...DEFAULT_CONFIG, fontWeight: 400 }

  it("uses the type-derived global weight by default", () => {
    // name -> baseWeight + 100
    expect(resolveFontWeight({ id: "n", type: "name", text: "" }, cfg)).toBe(500)
  })

  it("forces 700 when bold and no explicit weight", () => {
    expect(resolveFontWeight({ id: "n", type: "name", text: "", bold: true }, cfg)).toBe(700)
  })

  it("an explicit per-item weight wins over bold", () => {
    expect(resolveFontWeight({ id: "n", type: "name", text: "", bold: true, fontWeight: 300 }, cfg)).toBe(300)
  })

  it("ignores a non-positive explicit weight", () => {
    expect(resolveFontWeight({ id: "n", type: "name", text: "", fontWeight: 0 }, cfg)).toBe(500)
  })
})

describe("user presets", () => {
  beforeEach(() => {
    useCreditStore.setState({ userPresets: [], config: { ...DEFAULT_CONFIG } })
  })

  it("saveUserPreset captures the current config", () => {
    useCreditStore.getState().updateConfig({ textColor: "#abcdef", fontSizeTitle: 99 })
    useCreditStore.getState().saveUserPreset("Mi look")
    const presets = useCreditStore.getState().userPresets
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe("Mi look")
    expect(presets[0].config.textColor).toBe("#abcdef")
    expect(presets[0].config.fontSizeTitle).toBe(99)
    expect(typeof presets[0].id).toBe("string")
  })

  it("applyUserPreset restores the saved config", () => {
    useCreditStore.getState().updateConfig({ textColor: "#abcdef" })
    useCreditStore.getState().saveUserPreset("Mi look")
    const id = useCreditStore.getState().userPresets[0].id
    useCreditStore.getState().updateConfig({ textColor: "#000000" })
    useCreditStore.getState().applyUserPreset(id)
    expect(useCreditStore.getState().config.textColor).toBe("#abcdef")
  })

  it("applyUserPreset backfills config keys missing from an older preset", () => {
    const partial: Partial<CreditConfig> = { ...DEFAULT_CONFIG, textColor: "#abcdef" }
    delete (partial as Record<string, unknown>).textBoxWidth
    useCreditStore.setState({
      userPresets: [{ id: "old", name: "Old", config: partial as CreditConfig, createdAt: 0 }],
    })
    useCreditStore.getState().applyUserPreset("old")
    expect(useCreditStore.getState().config.textColor).toBe("#abcdef")
    expect(useCreditStore.getState().config.textBoxWidth).toBe(DEFAULT_CONFIG.textBoxWidth)
  })

  it("applyUserPreset is a no-op for an unknown id", () => {
    useCreditStore.getState().updateConfig({ textColor: "#abcdef" })
    useCreditStore.getState().applyUserPreset("nope")
    expect(useCreditStore.getState().config.textColor).toBe("#abcdef")
  })

  it("deleteUserPreset removes the preset by id", () => {
    useCreditStore.getState().saveUserPreset("A")
    useCreditStore.getState().saveUserPreset("B")
    const id = useCreditStore.getState().userPresets[0].id
    useCreditStore.getState().deleteUserPreset(id)
    const presets = useCreditStore.getState().userPresets
    expect(presets).toHaveLength(1)
    expect(presets[0].name).toBe("B")
  })
})
