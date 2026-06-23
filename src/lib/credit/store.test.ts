import { describe, it, expect, beforeEach } from "vitest"
import {
  useCreditStore,
  getFontSize,
  getFontWeight,
  resolveAlignment,
} from "./store"
import { CreditItem, DEFAULT_CONFIG } from "./types"

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
})
