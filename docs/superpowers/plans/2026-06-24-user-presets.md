# User-Saved Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user save the current `config` as a named preset and reapply or delete it later, alongside the 6 fixed presets.

**Architecture:** A new `userPresets: UserPreset[]` slice in the zustand store (persisted to localStorage, not exported with the project) plus three actions. The `PresetBar` component gains a "Mis presets" dropdown for apply/delete and a `Dialog` for naming on save.

**Tech Stack:** Next.js 16, React 19, TypeScript, zustand (+persist), shadcn/ui (`dropdown-menu`, `dialog`), Vitest 4 + happy-dom.

## Global Constraints

- A preset captures **only `config`** (full `CreditConfig` snapshot). Never items or fonts.
- `userPresets` are **local to the browser**: persisted via zustand `persist`, but NOT added to `exportProject`.
- Applying a preset replaces the whole config, backfilled over `DEFAULT_CONFIG` so keys added after the preset was saved get their default.
- Duplicate names (trim, case-insensitive) are blocked at the save dialog.
- Commit messages in English, end with the `Co-Authored-By` trailer.
- Tests live next to source as `*.test.ts`; run with `pnpm test:run`.
- UI components are not unit-tested in this codebase (verified via `tsc` + `next build` + manual), matching existing convention.

---

### Task 1: Store slice + actions + persistence (TDD)

**Files:**
- Modify: `src/lib/credit/types.ts` (add `UserPreset` interface)
- Modify: `src/lib/credit/store.ts` (state field, 3 actions, `partialize`, `merge`)
- Test: `src/lib/credit/store.test.ts` (new `describe("user presets")` block)

**Interfaces:**
- Consumes: existing `DEFAULT_CONFIG`, `uuid` (already imported in `store.ts`), `useCreditStore`.
- Produces:
  - `interface UserPreset { id: string; name: string; config: CreditConfig; createdAt: number }` (exported from `types.ts`)
  - `userPresets: UserPreset[]` on the store state
  - `saveUserPreset(name: string): void` — appends a preset snapshotting the current `config`
  - `deleteUserPreset(id: string): void`
  - `applyUserPreset(id: string): void` — sets `config` to `{ ...DEFAULT_CONFIG, ...preset.config }`; no-op if id not found

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/credit/store.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test:run src/lib/credit/store.test.ts`
Expected: FAIL — `saveUserPreset is not a function` / `userPresets` undefined.

- [ ] **Step 3: Add the `UserPreset` type**

In `src/lib/credit/types.ts`, after the `FontItem` interface, add:

```ts
export interface UserPreset {
  id: string
  name: string
  config: CreditConfig // full snapshot of config at save time
  createdAt: number
}
```

- [ ] **Step 4: Wire the store**

In `src/lib/credit/store.ts`:

Add `UserPreset` to the type import from `./types`:

```ts
import {
  CreditItem,
  CreditItemType,
  CreditConfig,
  DEFAULT_CONFIG,
  DEFAULT_ITEMS,
  FontItem,
  Alignment,
  UserPreset,
} from "./types"
```

In `interface CreditState`, add the field (near `fonts`) and the action signatures (near the other actions):

```ts
  userPresets: UserPreset[]
```

```ts
  saveUserPreset: (name: string) => void
  deleteUserPreset: (id: string) => void
  applyUserPreset: (id: string) => void
```

In the `create()` initial state object, after `fonts: DEFAULT_FONTS,`:

```ts
      userPresets: [],
```

Add the three action implementations (after `updateFont`):

```ts
      saveUserPreset: (name) =>
        set((state) => ({
          userPresets: [
            ...state.userPresets,
            { id: uuid(), name, config: { ...state.config }, createdAt: Date.now() },
          ],
        })),

      deleteUserPreset: (id) =>
        set((state) => ({
          userPresets: state.userPresets.filter((p) => p.id !== id),
        })),

      applyUserPreset: (id) =>
        set((state) => {
          const preset = state.userPresets.find((p) => p.id === id)
          if (!preset) return state
          return { config: { ...DEFAULT_CONFIG, ...preset.config } }
        }),
```

In `partialize`, add `userPresets`:

```ts
      partialize: (state) => ({
        items: state.items,
        config: state.config,
        fonts: state.fonts,
        projectName: state.projectName,
        userPresets: state.userPresets,
      }),
```

In `merge`, add the backfill:

```ts
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CreditState>
        return {
          ...current,
          ...p,
          config: mergePersistedConfig(p.config),
          userPresets: p.userPresets ?? [],
        }
      },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm test:run src/lib/credit/store.test.ts`
Expected: PASS — all 5 new tests green.

- [ ] **Step 6: Run the full suite + type-check**

Run: `pnpm test:run`
Expected: PASS — 135 prior + 5 new = 140 tests.

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/credit/types.ts src/lib/credit/store.ts src/lib/credit/store.test.ts
git commit -m "$(cat <<'EOF'
feat: store slice and actions for user-saved presets

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: "Mis presets" dropdown + save dialog in PresetBar

**Files:**
- Modify: `src/components/credit/ConfigPanel.tsx` (imports + `PresetBar` body)

**Interfaces:**
- Consumes from Task 1: `userPresets`, `saveUserPreset`, `deleteUserPreset`, `applyUserPreset` off `useCreditStore`.
- Produces: no new exported API (UI only).

- [ ] **Step 1: Add imports**

In `src/components/credit/ConfigPanel.tsx`, add `Bookmark` and `X` to the existing `lucide-react` import block:

```ts
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
} from "lucide-react"
```

After the existing `Select` import block, add the dropdown and dialog imports:

```ts
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
```

- [ ] **Step 2: Extend the `PresetBar` component**

In `src/components/credit/ConfigPanel.tsx`, change the destructure at the top of `PresetBar` from:

```ts
export function PresetBar() {
  const { updateConfig, config } = useCreditStore()
```

to:

```ts
export function PresetBar() {
  const { updateConfig, config, userPresets, saveUserPreset, deleteUserPreset, applyUserPreset } =
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
```

(The fixed `presets` array stays unchanged.)

Then replace the `return (...)` block (currently the `<div>` with only the fixed-preset `.map`) with:

```tsx
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <Bookmark className="h-3.5 w-3.5" />
            Mis presets
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
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
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify the suite still passes**

Run: `pnpm test:run`
Expected: PASS — 140 tests (no UI tests added).

- [ ] **Step 5: Production build**

Run: `pnpm build`
Expected: build succeeds, type-check passes.

- [ ] **Step 6: Manual verification (browser)**

Start dev (`./dev.ps1` or `pnpm dev`), open http://localhost:3000:
1. Change some look (color/font), open "Mis presets" → "Guardar actual…", name it, Guardar.
2. Change the look again, open "Mis presets", click the preset name → look restored.
3. Open "Mis presets", click the `X` on a preset → it disappears, menu stays open, no apply happened.
4. Open the save dialog, type an existing name → button disabled + "Ya existe un preset con ese nombre".
5. Reload the page → saved presets persist (localStorage).
6. Export project JSON, inspect it → no `userPresets` key present.

- [ ] **Step 7: Commit**

```bash
git add src/components/credit/ConfigPanel.tsx
git commit -m "$(cat <<'EOF'
feat: "Mis presets" dropdown to save/apply/delete user presets

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```
