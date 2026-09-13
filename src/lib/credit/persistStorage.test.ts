import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createProjectStorage, KeyValueBackend } from "./persistStorage"

type S = { items: unknown[]; config: object }

function memoryBackend(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial))
  const backend: KeyValueBackend & { data: Map<string, unknown>; sets: number } = {
    data,
    sets: 0,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => { backend.sets++; data.set(k, v) },
    del: async (k) => { data.delete(k) },
  }
  return backend
}

function legacyStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    removeItem: (k: string) => { data.delete(k) },
  }
}

const DEBOUNCE = 300

describe("createProjectStorage", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("loads the stored value from the backend", async () => {
    const value = { state: { items: [1], config: {} }, version: 0 }
    const storage = createProjectStorage<S>({ backend: memoryBackend({ p: value }), legacy: null, debounceMs: DEBOUNCE, onError: vi.fn() })
    expect(await storage.getItem("p")).toEqual(value)
  })

  it("returns null when nothing is stored", async () => {
    const storage = createProjectStorage<S>({ backend: memoryBackend(), legacy: legacyStorage(), debounceMs: DEBOUNCE, onError: vi.fn() })
    expect(await storage.getItem("p")).toBeNull()
  })

  it("migrates a legacy localStorage value into the backend and removes it", async () => {
    const value = { state: { items: [1], config: {} }, version: 0 }
    const backend = memoryBackend()
    const legacy = legacyStorage({ p: JSON.stringify(value) })
    const storage = createProjectStorage<S>({ backend, legacy, debounceMs: DEBOUNCE, onError: vi.fn() })
    expect(await storage.getItem("p")).toEqual(value)
    expect(backend.data.get("p")).toEqual(value)
    expect(legacy.data.has("p")).toBe(false)
  })

  it("ignores writes until the stored value has been loaded", async () => {
    const backend = memoryBackend({ p: { state: { items: ["saved"], config: {} }, version: 0 } })
    const storage = createProjectStorage<S>({ backend, legacy: null, debounceMs: DEBOUNCE, onError: vi.fn() })
    await storage.setItem("p", { state: { items: [], config: {} }, version: 0 })
    await vi.advanceTimersByTimeAsync(DEBOUNCE)
    expect(backend.sets).toBe(0)
    expect(backend.data.get("p")).toEqual({ state: { items: ["saved"], config: {} }, version: 0 })
  })

  it("debounces rapid writes into one with the latest value", async () => {
    const backend = memoryBackend()
    const storage = createProjectStorage<S>({ backend, legacy: null, debounceMs: DEBOUNCE, onError: vi.fn() })
    await storage.getItem("p")
    const config = {}
    storage.setItem("p", { state: { items: [1], config }, version: 0 })
    storage.setItem("p", { state: { items: [2], config }, version: 0 })
    await vi.advanceTimersByTimeAsync(DEBOUNCE)
    expect(backend.sets).toBe(1)
    expect(backend.data.get("p")).toEqual({ state: { items: [2], config }, version: 0 })
  })

  it("skips the write when no persisted field changed by reference", async () => {
    const backend = memoryBackend()
    const storage = createProjectStorage<S>({ backend, legacy: null, debounceMs: DEBOUNCE, onError: vi.fn() })
    await storage.getItem("p")
    const state = { items: [1], config: {} }
    storage.setItem("p", { state: { ...state }, version: 0 })
    await vi.advanceTimersByTimeAsync(DEBOUNCE)
    storage.setItem("p", { state: { ...state }, version: 0 })
    await vi.advanceTimersByTimeAsync(DEBOUNCE)
    expect(backend.sets).toBe(1)
  })

  it("reports a failed write", async () => {
    const backend = memoryBackend()
    backend.set = async () => { throw new Error("quota") }
    const onError = vi.fn()
    const storage = createProjectStorage<S>({ backend, legacy: null, debounceMs: DEBOUNCE, onError })
    await storage.getItem("p")
    storage.setItem("p", { state: { items: [1], config: {} }, version: 0 })
    await vi.advanceTimersByTimeAsync(DEBOUNCE)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it("never writes after a failed load, so defaults can't overwrite the saved project", async () => {
    const backend = memoryBackend()
    backend.get = async () => { throw new Error("blocked") }
    const onError = vi.fn()
    const storage = createProjectStorage<S>({ backend, legacy: null, debounceMs: DEBOUNCE, onError })
    expect(await storage.getItem("p")).toBeNull()
    storage.setItem("p", { state: { items: [], config: {} }, version: 0 })
    await vi.advanceTimersByTimeAsync(DEBOUNCE)
    expect(backend.sets).toBe(0)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
