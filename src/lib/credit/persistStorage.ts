// Persistence for the project store. IndexedDB instead of localStorage: logos,
// uploaded fonts and images are data URLs, and localStorage caps each origin at
// ~5 MB. Values are stored as structured-clone objects (no JSON round trip).

import type { PersistStorage, StorageValue } from "zustand/middleware"

export interface KeyValueBackend {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<void>
  del: (key: string) => Promise<void>
}

interface LegacyStorage {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
}

interface Options {
  backend: KeyValueBackend
  // Where the store used to live; its value is moved into the backend on first load.
  legacy: LegacyStorage | null
  debounceMs: number
  onError: (error: unknown) => void
}

function sameFields(a: object | null, b: object): boolean {
  if (!a) return false
  const ka = Object.keys(a)
  const kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return kb.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

export function createProjectStorage<S extends object>({ backend, legacy, debounceMs, onError }: Options) {
  // Writes stay off until the saved project is loaded: zustand/persist writes on
  // every set, and an early write would replace the project with the defaults.
  let ready = false
  let lastState: S | null = null
  let pending: { name: string; value: StorageValue<S> } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = async () => {
    if (timer !== null) { clearTimeout(timer); timer = null }
    if (!pending) return
    const { name, value } = pending
    pending = null
    try {
      await backend.set(name, value)
    } catch (e) {
      onError(e)
    }
  }

  const storage: PersistStorage<S> & { flush: () => Promise<void> } = {
    getItem: async (name) => {
      try {
        let value = (await backend.get(name)) as StorageValue<S> | null
        const raw = value == null ? legacy?.getItem(name) : null
        if (raw) {
          value = JSON.parse(raw) as StorageValue<S>
          await backend.set(name, value)
          legacy?.removeItem(name)
        }
        ready = true
        return value ?? null
      } catch (e) {
        onError(e)
        return null
      }
    },
    setItem: (name, value) => {
      if (!ready || sameFields(lastState, value.state)) return
      lastState = value.state
      pending = { name, value }
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(flush, debounceMs)
    },
    removeItem: async (name) => {
      pending = null
      await backend.del(name)
    },
    flush,
  }
  return storage
}

export function indexedDbBackend(dbName: string, storeName = "kv"): KeyValueBackend {
  let db: Promise<IDBDatabase> | null = null
  const open = () =>
    (db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(storeName)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    }))
  const run = async <T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>) => {
    const conn = await open()
    return new Promise<T>((resolve, reject) => {
      const tx = conn.transaction(storeName, mode)
      const req = op(tx.objectStore(storeName))
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = tx.onabort = () => reject(tx.error ?? req.error)
    })
  }
  return {
    get: (key) => run("readonly", (s) => s.get(key)),
    set: async (key, value) => { await run("readwrite", (s) => s.put(value, key)) },
    del: async (key) => { await run("readwrite", (s) => s.delete(key)) },
  }
}

// Server render and tests (happy-dom has no IndexedDB).
export function memoryBackend(): KeyValueBackend {
  const data = new Map<string, unknown>()
  return {
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => { data.set(key, value) },
    del: async (key) => { data.delete(key) },
  }
}
