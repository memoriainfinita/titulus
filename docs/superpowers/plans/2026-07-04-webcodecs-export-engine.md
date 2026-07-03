# WebCodecs Export Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the FFmpeg-wasm export pipeline with a single-pass `toCanvas` → WebCodecs hardware encode via Mediabunny, MP4-only.

**Architecture:** One interleaved loop per frame: deterministic `setManualProgress` render → html-to-image `toCanvas` → draw onto a persistent even-dimensioned staging canvas → `await CanvasSource.add()` (backpressure). Mediabunny (`Output` + `Mp4OutputFormat` + `BufferTarget`) muxes hardware-encoded H.264. No PNG step, no MEMFS, no unpkg, no frame accumulation.

**Tech Stack:** Next.js 16 / React 19 / TypeScript, mediabunny (new dep), html-to-image (kept), Vitest 4 + happy-dom.

Spec: `docs/superpowers/specs/2026-07-04-webcodecs-export-engine-design.md`

## Global Constraints

- Package manager: pnpm (`pnpm add` / `pnpm remove`). Windows PowerShell environment.
- Tests: `pnpm test:run` (Vitest). Type check: `pnpm exec tsc --noEmit`. Lint: `pnpm lint`. Build: `pnpm build`.
- Every task must leave the repo compiling (`tsc` clean) and the full suite green. Suite before this plan: 207 tests.
- Commit messages in English, conventional prefixes (`feat:`, `refactor:`, `chore:`).
- No emojis anywhere. UI copy in Spanish (existing style).
- `buildEmbeddedFontsCSS` in `useVideoExport.ts` is KEPT verbatim (fonts must survive capture).
- The deterministic `manualProgress` render path and the save flow in `ExportDialog` (file picker, download fallback, "Descargar de nuevo") are NOT touched.

## File Structure

- Create: `src/lib/credit/exportSettings.ts` — pure helpers: quality mapping, even dimensions, frame timing, progress math.
- Create: `src/lib/credit/exportSettings.test.ts` — unit tests for the above.
- Modify: `src/lib/credit/useVideoExport.ts` — engine rewrite (FFmpeg → Mediabunny), new `checkExportSupport`.
- Modify: `src/components/credit/ExportDialog.tsx` — webm removal, support check on open, single-phase ETA, copy.
- Modify: `package.json` / `pnpm-lock.yaml` — add `mediabunny`; remove `@ffmpeg/ffmpeg`, `@ffmpeg/util` (last task).

Transitional strategy: Task 3 rewrites the engine but keeps legacy phase names in the `ExportProgress` union and the (ignored) `format` field so `ExportDialog` still compiles; Task 4 reworks the dialog; Task 5 narrows the types and removes the FFmpeg deps.

---

### Task 1: Install mediabunny

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (via pnpm)

**Interfaces:**
- Produces: importable `mediabunny` package (`Output`, `Mp4OutputFormat`, `BufferTarget`, `CanvasSource`, `canEncodeVideo`, `QUALITY_MEDIUM`, `QUALITY_HIGH`, `QUALITY_VERY_HIGH`).

- [ ] **Step 1: Install**

Run: `pnpm add mediabunny`
Expected: added to `dependencies`. Pure TypeScript, zero deps — no build approval needed in `pnpm-workspace.yaml`.

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: clean (no source uses it yet).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add mediabunny for WebCodecs export"
```

---

### Task 2: Pure export helpers (`exportSettings.ts`)

**Files:**
- Create: `src/lib/credit/exportSettings.ts`
- Test: `src/lib/credit/exportSettings.test.ts`

**Interfaces:**
- Produces:
  - `type ExportQuality = "fast" | "balanced" | "high"`
  - `qualityToBitrate(quality: ExportQuality)` → mediabunny `Quality` constant
  - `evenDimensions(stageWidth: number, stageHeight: number, scale: number): { width: number; height: number }`
  - `frameTiming(frameIndex: number, fps: number): { timestamp: number; duration: number }`
  - `renderProgress(framesDone: number, totalFrames: number): number` (0–0.95)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/credit/exportSettings.test.ts
import { describe, expect, it } from "vitest"
import { QUALITY_HIGH, QUALITY_MEDIUM, QUALITY_VERY_HIGH } from "mediabunny"
import {
  evenDimensions,
  frameTiming,
  qualityToBitrate,
  renderProgress,
} from "@/lib/credit/exportSettings"

describe("qualityToBitrate", () => {
  it("maps fast/balanced/high to mediabunny presets", () => {
    expect(qualityToBitrate("fast")).toBe(QUALITY_MEDIUM)
    expect(qualityToBitrate("balanced")).toBe(QUALITY_HIGH)
    expect(qualityToBitrate("high")).toBe(QUALITY_VERY_HIGH)
  })
})

describe("evenDimensions", () => {
  it("keeps already-even dimensions", () => {
    expect(evenDimensions(1920, 1080, 1)).toEqual({ width: 1920, height: 1080 })
  })
  it("rounds odd dimensions to even (H.264/yuv420p requirement)", () => {
    expect(evenDimensions(855, 481, 1)).toEqual({ width: 856, height: 482 })
  })
  it("applies the scale multiplier before rounding", () => {
    expect(evenDimensions(1920, 1080, 1.5)).toEqual({ width: 2880, height: 1620 })
    // 855 * 2 = 1710 (already even)
    expect(evenDimensions(855, 481, 2)).toEqual({ width: 1710, height: 962 })
  })
})

describe("frameTiming", () => {
  it("computes timestamp and duration in seconds from frame index and fps", () => {
    expect(frameTiming(0, 30)).toEqual({ timestamp: 0, duration: 1 / 30 })
    expect(frameTiming(30, 30)).toEqual({ timestamp: 1, duration: 1 / 30 })
    expect(frameTiming(12, 24)).toEqual({ timestamp: 0.5, duration: 1 / 24 })
  })
})

describe("renderProgress", () => {
  it("maps frames done to the 0-0.95 window", () => {
    expect(renderProgress(0, 100)).toBe(0)
    expect(renderProgress(50, 100)).toBeCloseTo(0.475)
    expect(renderProgress(100, 100)).toBeCloseTo(0.95)
  })
  it("never exceeds 0.95 and handles zero totals", () => {
    expect(renderProgress(120, 100)).toBeCloseTo(0.95)
    expect(renderProgress(5, 0)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run exportSettings`
Expected: FAIL — module `@/lib/credit/exportSettings` not found.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/credit/exportSettings.ts
// Pure helpers for the WebCodecs export engine. No React, no DOM.
import { QUALITY_HIGH, QUALITY_MEDIUM, QUALITY_VERY_HIGH } from "mediabunny"

export type ExportQuality = "fast" | "balanced" | "high"

const QUALITY_MAP = {
  fast: QUALITY_MEDIUM,
  balanced: QUALITY_HIGH,
  high: QUALITY_VERY_HIGH,
} as const

// WebCodecs has no CRF; quality maps to mediabunny's subjective bitrate presets.
export function qualityToBitrate(quality: ExportQuality) {
  return QUALITY_MAP[quality]
}

// H.264/yuv420p requires even dimensions. The old pipeline enforced this with
// an ffmpeg scale filter; now the staging canvas is created at these dimensions.
// Must match the evenDim() preview shown in ExportDialog.
export function evenDimensions(
  stageWidth: number,
  stageHeight: number,
  scale: number,
): { width: number; height: number } {
  const even = (n: number) => Math.round(n / 2) * 2
  return { width: even(stageWidth * scale), height: even(stageHeight * scale) }
}

// CanvasSource.add() takes timestamp and duration in seconds.
export function frameTiming(
  frameIndex: number,
  fps: number,
): { timestamp: number; duration: number } {
  return { timestamp: frameIndex / fps, duration: 1 / fps }
}

// Rendering (capture+encode interleaved) owns 0-0.95 of the progress bar;
// finalizing (mux flush) takes the rest.
export function renderProgress(framesDone: number, totalFrames: number): number {
  if (totalFrames <= 0) return 0
  return Math.min(0.95, 0.95 * (framesDone / totalFrames))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run exportSettings`
Expected: PASS (9 tests). Then `pnpm test:run` → 216 green, `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit/exportSettings.ts src/lib/credit/exportSettings.test.ts
git commit -m "feat: pure helpers for WebCodecs export (quality, dimensions, timing, progress)"
```

---

### Task 3: Rewrite the export engine (`useVideoExport.ts`)

**Files:**
- Modify: `src/lib/credit/useVideoExport.ts` (full rewrite of the engine; `buildEmbeddedFontsCSS` kept verbatim)

**Interfaces:**
- Consumes: Task 2 helpers (`qualityToBitrate`, `evenDimensions`, `frameTiming`, `renderProgress`, `ExportQuality`).
- Produces:
  - `checkExportSupport(width: number, height: number): Promise<boolean>` (module-level, NOT part of the hook)
  - `useVideoExport()` returning `{ isExporting, progress, exportVideo, cancelExport, reset }` — same shape as today; `exportVideo` same signature.
  - Transitional `ExportProgress.phase` union: `"idle" | "loading-ffmpeg" | "capturing" | "encoding" | "rendering" | "finalizing" | "done" | "error"` — the engine only emits idle/rendering/finalizing/done/error; the legacy names keep `ExportDialog` compiling until Task 4. Narrowed in Task 5.
  - `ExportOptions` keeps `format: "mp4" | "webm"` (ignored, output is always MP4). Removed in Task 5.

No unit tests: the hook drives DOM + WebCodecs (out of unit scope, as FFmpeg was). Gate: `tsc`, lint, full suite, and the manual verification checklist at the end of the plan.

- [ ] **Step 1: Rewrite the file**

Replace the entire content of `src/lib/credit/useVideoExport.ts` with:

```typescript
"use client"

import * as React from "react"
import { toCanvas } from "html-to-image"
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  canEncodeVideo,
} from "mediabunny"
import { CreditConfig, CreditItem, CreditMode } from "@/lib/credit/types"
import {
  ExportQuality,
  evenDimensions,
  frameTiming,
  qualityToBitrate,
  renderProgress,
} from "@/lib/credit/exportSettings"

export interface ExportOptions {
  fps: number
  width: number
  height: number
  // Raster scale multiplier applied at capture time (1 = stage resolution).
  // The logical width/height stay the same so text layout is unchanged.
  pixelRatio: number
  // Transitional: ignored, output is always MP4. Removed with the dialog rework.
  format: "mp4" | "webm"
  quality: ExportQuality
  // Estimated duration in seconds
  duration: number
}

export interface ExportProgress {
  // "loading-ffmpeg" | "capturing" | "encoding" are transitional legacy names so
  // ExportDialog compiles until its rework; the engine only emits
  // idle/rendering/finalizing/done/error.
  phase:
    | "idle"
    | "loading-ffmpeg"
    | "capturing"
    | "encoding"
    | "rendering"
    | "finalizing"
    | "done"
    | "error"
  currentFrame: number
  totalFrames: number
  message: string
  // 0-1
  overallProgress: number
}

// True when this browser can hardware/software-encode H.264 at the target size
// via WebCodecs. Called by ExportDialog when it opens, before any work starts.
export async function checkExportSupport(width: number, height: number): Promise<boolean> {
  if (typeof VideoEncoder === "undefined") return false
  try {
    return await canEncodeVideo("avc", { width, height })
  } catch {
    return false
  }
}

// Pre-fetch and embed Google Fonts as data URLs so they work in the captured image
// without CORS issues. Returns a CSS string with @font-face rules ready to embed.
async function buildEmbeddedFontsCSS(): Promise<string> {
  // ... KEEP THE CURRENT IMPLEMENTATION VERBATIM (lines 42-93 of the old file) ...
}

export function useVideoExport() {
  const [isExporting, setIsExporting] = React.useState(false)
  const [progress, setProgress] = React.useState<ExportProgress>({
    phase: "idle",
    currentFrame: 0,
    totalFrames: 0,
    message: "",
    overallProgress: 0,
  })
  const cancelRef = React.useRef(false)

  const exportVideo = React.useCallback(
    async (
      stageElement: HTMLElement,
      items: CreditItem[],
      config: CreditConfig,
      mode: CreditMode,
      options: ExportOptions,
      // Function to set manual progress on the credits component (0-1)
      setManualProgress: (p: number) => void,
    ): Promise<Blob | null> => {
      cancelRef.current = false
      setIsExporting(true)
      let output: Output | null = null

      const reportCancelled = () => {
        setProgress({
          phase: "idle",
          currentFrame: 0,
          totalFrames: 0,
          message: "Exportación cancelada",
          overallProgress: 0,
        })
      }

      try {
        const totalFrames = Math.max(1, Math.ceil(options.duration * options.fps))
        const { width: outWidth, height: outHeight } = evenDimensions(
          options.width,
          options.height,
          options.pixelRatio,
        )

        setProgress({
          phase: "rendering",
          currentFrame: 0,
          totalFrames,
          message: `Renderizando frames... 0/${totalFrames}`,
          overallProgress: 0,
        })

        // Staging canvas: CanvasSource wraps ONE canvas that is redrawn per frame
        // (toCanvas returns a new canvas each time). Its even dimensions satisfy
        // H.264/yuv420p — the old ffmpeg scale filter is gone.
        const staging = document.createElement("canvas")
        staging.width = outWidth
        staging.height = outHeight
        const ctx = staging.getContext("2d", { alpha: false })
        if (!ctx) throw new Error("No se pudo crear el canvas de exportación")

        output = new Output({
          // fastStart keeps the moov atom at the front (the old -movflags
          // +faststart); cheap because the whole file lives in BufferTarget anyway.
          format: new Mp4OutputFormat({ fastStart: "in-memory" }),
          target: new BufferTarget(),
        })
        const source = new CanvasSource(staging, {
          codec: "avc",
          bitrate: qualityToBitrate(options.quality),
        })
        output.addVideoTrack(source, { frameRate: options.fps })
        await output.start()

        // Built once per export; used for every frame's capture.
        const fontEmbedCSS = await buildEmbeddedFontsCSS()

        for (let i = 0; i < totalFrames; i++) {
          if (cancelRef.current) {
            await output.cancel()
            reportCancelled()
            return null
          }

          const p = i / (totalFrames - 1 || 1)
          setManualProgress(p)

          // Wait for React to paint (two RAFs ensure layout is committed)
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          })
          // Small extra delay for fonts/images to settle
          await new Promise((r) => setTimeout(r, 16))

          // Suppress CORS errors from html-to-image trying to read Google Fonts CSS
          // rules (we handle font embedding ourselves via fontEmbedCSS)
          const originalConsoleError = console.error
          console.error = function (...args: unknown[]) {
            const msg = args
              .map((a) => (typeof a === "string" ? a : (a as { message?: string })?.message || ""))
              .join(" ")
            if (
              msg.includes("cssRules") ||
              msg.includes("CSSStyleSheet") ||
              msg.includes("Cannot access rules") ||
              msg.includes("Error loading remote stylesheet") ||
              msg.includes("Failed to fetch")
            ) {
              return // suppress known html-to-image CORS noise
            }
            originalConsoleError.apply(console, args as never)
          }
          let captured: HTMLCanvasElement
          try {
            captured = await toCanvas(stageElement, {
              width: options.width,
              height: options.height,
              pixelRatio: options.pixelRatio,
              // Provide embedded fonts CSS to avoid CORS issues with Google Fonts CDN.
              // When provided, html-to-image skips its own (CORS-blocked) font collection.
              fontEmbedCSS: fontEmbedCSS || undefined,
              skipFonts: !!fontEmbedCSS,
              backgroundColor: config.useGradient ? undefined : config.backgroundColor,
            })
          } catch (err) {
            originalConsoleError.call(console, "Frame capture failed", err)
            throw new Error(`No se pudo capturar el frame ${i}`)
          } finally {
            console.error = originalConsoleError
          }

          // Redraw onto the fixed staging canvas and hand it to the encoder.
          ctx.drawImage(captured, 0, 0, staging.width, staging.height)
          const { timestamp, duration } = frameTiming(i, options.fps)
          // add() applies encoder backpressure: awaiting it bounds the encode queue.
          await source.add(timestamp, duration)

          setProgress({
            phase: "rendering",
            currentFrame: i + 1,
            totalFrames,
            message: `Renderizando frames... ${i + 1}/${totalFrames}`,
            overallProgress: renderProgress(i + 1, totalFrames),
          })
        }

        source.close()

        setProgress({
          phase: "finalizing",
          currentFrame: totalFrames,
          totalFrames,
          message: "Finalizando...",
          overallProgress: 0.97,
        })
        await output.finalize()

        const buffer = (output.target as BufferTarget).buffer
        if (!buffer) throw new Error("La exportación no produjo datos")
        const blob = new Blob([buffer], { type: "video/mp4" })

        setProgress({
          phase: "done",
          currentFrame: totalFrames,
          totalFrames,
          message: "Video exportado correctamente",
          overallProgress: 1,
        })

        return blob
      } catch (err) {
        // output.cancel() frees encoder resources in both the cancel and error paths.
        if (output && output.state !== "finalized" && output.state !== "canceled") {
          try {
            await output.cancel()
          } catch {
            // ignore
          }
        }
        if (cancelRef.current) {
          reportCancelled()
          return null
        }
        console.error("Export failed", err)
        setProgress({
          phase: "error",
          currentFrame: 0,
          totalFrames: 0,
          message: err instanceof Error ? err.message : "Error desconocido en la exportación",
          overallProgress: 0,
        })
        return null
      } finally {
        setIsExporting(false)
      }
    },
    [],
  )

  const cancelExport = React.useCallback(() => {
    // The loop checks this between frames (encoding is per-frame; there is no
    // long uninterruptible exec anymore) and calls output.cancel() itself.
    cancelRef.current = true
  }, [])

  const reset = React.useCallback(() => {
    setProgress({
      phase: "idle",
      currentFrame: 0,
      totalFrames: 0,
      message: "",
      overallProgress: 0,
    })
  }, [])

  return { isExporting, progress, exportVideo, cancelExport, reset }
}
```

Note for the implementer: `buildEmbeddedFontsCSS` is copied verbatim from the current file — do NOT retype it, copy lines 42-93. Deleted along the way: `FFmpeg`/`toBlobURL` imports, `FFMPEG_BASE_URL`, `QUALITY_PRESETS`, `loadFfmpeg`, `ffmpegRef`, MEMFS cleanup loops, ffmpeg args, `toPng`, `cacheBust`, the dataURL→fetch→Uint8Array conversion, `ffmpeg.terminate()`.

If `tsc` reports a mismatch on any mediabunny name (`fastStart` values, `CanvasSource.close`, `output.state` literals), consult `node_modules/mediabunny/dist/mediabunny.d.ts` for the exact name — do not guess and do not silence with `any`.

- [ ] **Step 2: Verify it compiles and the suite is green**

Run: `pnpm exec tsc --noEmit && pnpm test:run`
Expected: tsc clean; 216 tests green. (`ExportDialog` still compiles thanks to the transitional union; its `capturing`/`encoding` branches just never fire — the ETA is temporarily absent until Task 4.)

- [ ] **Step 3: Lint**

Run: `pnpm lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/credit/useVideoExport.ts
git commit -m "feat: WebCodecs export engine via mediabunny, replacing FFmpeg-wasm"
```

---

### Task 4: Rework `ExportDialog`

**Files:**
- Modify: `src/components/credit/ExportDialog.tsx`

**Interfaces:**
- Consumes: `checkExportSupport(width, height)` from `useVideoExport.ts` (Task 3); phases `rendering`/`finalizing`.

- [ ] **Step 1: Apply the edits**

(a) Import `checkExportSupport`:

```typescript
import { useVideoExport, checkExportSupport, ExportProgress } from "@/lib/credit/useVideoExport"
```

(b) Delete the `format` state (line 102). Replace every use of `format` with the literal: `fileName` becomes `` `${safeName}.mp4` ``, the picker type becomes `{ description: "Video MP4", accept: { "video/mp4": [".mp4"] } }`, `exportVideo` options get `format: "mp4"` (transitional field, removed in Task 5), and "Descargar de nuevo" uses `` `${safeName}.mp4` ``.

(c) Delete the whole "Formato" `RadioGroup` block (the `<div className="space-y-2">` containing `fmt-mp4`/`fmt-webm`, lines 305-331).

(d) Support check when the dialog opens. Placement matters: this effect lists `outWidth`/`outHeight` in its deps, so it MUST go AFTER the `outWidth`/`outHeight` consts (see (f)), not with the other effects above them — otherwise TDZ error:

```typescript
// WebCodecs support check, run when the dialog opens (spec: the user must not
// discover an unsupported browser after picking a save destination).
const [encoderSupported, setEncoderSupported] = React.useState<boolean | null>(null)
React.useEffect(() => {
  if (!open) return
  let alive = true
  checkExportSupport(outWidth, outHeight).then((ok) => {
    if (alive) setEncoderSupported(ok)
  })
  return () => {
    alive = false
  }
}, [open, outWidth, outHeight])
```

(e) Gate the start button and show the message (replace the current button block, lines 430-433):

```tsx
{encoderSupported === false && (
  <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3">
    <p className="text-sm text-destructive">
      Este navegador no puede codificar H.264 (WebCodecs). Usa un Chrome, Edge,
      Firefox o Safari de escritorio actualizado.
    </p>
  </div>
)}

<Button
  onClick={handleExport}
  className="w-full"
  size="lg"
  disabled={encoderSupported !== true}
>
  <Download className="h-4 w-4 mr-2" />
  Iniciar exportación
</Button>
```

(f) Single-phase ETA — replace the per-phase block (lines 137-161 incl. the stale comment) with:

```typescript
// Mark when the export starts so the ETA extrapolates from frame progress.
React.useEffect(() => {
  phaseStartRef.current = performance.now()
}, [progress.phase])

const totalFrames = Math.max(1, Math.ceil(duration * fps))
const evenDim = (n: number) => Math.round(n / 2) * 2
const outWidth = evenDim(config.stageWidth * scale)
const outHeight = evenDim(config.stageHeight * scale)
const SCALE_PRESETS = [1, 1.5, 2, 3]

// Rendering is linear in frames (capture+encode interleaved), so a single
// extrapolation covers the whole bar. Reading the ref and the clock during
// render is intentional: the dialog re-renders every second via the
// elapsed-time interval, so the ETA refreshes with it.
// eslint-disable-next-line react-hooks/refs, react-hooks/purity -- ver comentario
const phaseElapsedMs = phaseStartRef.current != null ? performance.now() - phaseStartRef.current : 0
let etaSeconds: number | null = null
if (progress.phase === "rendering" && progress.totalFrames > 0) {
  etaSeconds = estimateRemainingSeconds(phaseElapsedMs, progress.currentFrame / progress.totalFrames)
}
```

(g) `PhaseIcon` — replace the spinner cases (lines 76-79) with:

```typescript
case "rendering":
case "finalizing":
  return <Loader2 className="h-5 w-5 animate-spin text-primary" />
```

(h) Progress bar color conditional (line 459): replace `progress.phase === "encoding" || progress.phase === "finalizing"` with `progress.phase === "finalizing"`.

(i) Copy updates: `DialogDescription` (line 275) becomes "Genera un archivo de video con tus créditos. Captura frame a frame y codifica H.264 con aceleración por hardware (WebCodecs)."; in the amber info box (lines 421-425) delete the `<li>` about downloading ffmpeg (~30 MB) and keep the other two.

- [ ] **Step 2: Verify**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run`
Expected: all clean, 216 green.

- [ ] **Step 3: Commit**

```bash
git add src/components/credit/ExportDialog.tsx
git commit -m "feat: ExportDialog for WebCodecs engine (mp4-only, support check, single-phase ETA)"
```

---

### Task 5: Narrow types, drop FFmpeg

**Files:**
- Modify: `src/lib/credit/useVideoExport.ts` (narrow `ExportProgress.phase`, drop `ExportOptions.format`)
- Modify: `src/components/credit/ExportDialog.tsx` (drop the transitional `format: "mp4"` option)
- Modify: `package.json`, `pnpm-lock.yaml` (remove FFmpeg deps)

- [ ] **Step 1: Narrow the types**

In `useVideoExport.ts`, replace the transitional unions with the final ones and delete their transitional comments:

```typescript
export interface ExportOptions {
  fps: number
  width: number
  height: number
  // Raster scale multiplier applied at capture time (1 = stage resolution).
  // The logical width/height stay the same so text layout is unchanged.
  pixelRatio: number
  quality: ExportQuality
  // Estimated duration in seconds
  duration: number
}

export interface ExportProgress {
  phase: "idle" | "rendering" | "finalizing" | "done" | "error"
  currentFrame: number
  totalFrames: number
  message: string
  // 0-1
  overallProgress: number
}
```

In `ExportDialog.tsx`, delete the `format: "mp4",` line from the `exportVideo` options object. `PhaseIcon`'s `switch` already only names surviving phases.

- [ ] **Step 2: Remove the FFmpeg dependencies**

Run: `pnpm remove @ffmpeg/ffmpeg @ffmpeg/util`
Expected: both gone from `package.json`.

- [ ] **Step 3: Sweep for leftovers**

Run: `git grep -n -i "ffmpeg" -- src/`
Expected: no hits. (Hits in `state.md`/`docs/` are history and fine.)

- [ ] **Step 4: Full verification**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run && pnpm build`
Expected: all clean, 216 tests green, production build OK.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/credit/useVideoExport.ts src/components/credit/ExportDialog.tsx
git commit -m "chore: drop FFmpeg-wasm deps and transitional export types"
```

---

## Manual verification checklist (user, after Task 5)

Same project exported before/after the plan (a pre-plan MP4 kept for comparison):

- [ ] MP4 plays correctly (duration, fps, resolution match the dialog summary).
- [ ] Visual fidelity vs the old export: rich text runs, shadows, blur, vignette, images.
- [ ] The three font sources render in the MP4: Google, custom upload, system — including the custom+Google combo (possible pre-existing `skipFonts` gap; if the custom font drops out, file it as a bug, it is not a regression of this plan).
- [ ] Cancel mid-export leaves the dialog reusable (start again works).
- [ ] Save picker flow and download fallback still work; "Descargar de nuevo" works.
- [ ] Odd stage size (e.g. 855×481) exports without encoder errors.
- [ ] Total export time compared against the old engine (expectation: capture-bound, minutes → well under half).
- [ ] No network requests to unpkg.com during export (DevTools Network).
