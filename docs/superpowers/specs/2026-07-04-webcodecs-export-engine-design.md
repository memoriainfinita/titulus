# WebCodecs export engine — design

Date: 2026-07-04
Status: approved (brainstorming 2026-07-04)
Replaces: FFmpeg-wasm pipeline in `src/lib/credit/useVideoExport.ts`; sequentia conclusions of 2026-06-24 (state.md TODO, rewritten 2026-07-03)

## Goal

Replace the video export engine (per-frame `toPng` → PNG in MEMFS → FFmpeg-wasm software H.264) with a single-pass pipeline: `toCanvas` capture → WebCodecs hardware encode via Mediabunny. Motivation: export takes >5 min for ~1 min of credits; the current pipeline encodes PNG per frame, re-decodes them in wasm, encodes H.264 in software, holds every frame in memory, and loads FFmpeg core from unpkg.

## Decisions (user-approved)

- WebCodecs only: the FFmpeg-wasm path is deleted, no fallback. Desktop browsers (Chrome/Edge 94+, Firefox 130+, Safari 16.4+) all have `VideoEncoder`; removing FFmpeg also removes the unpkg dependency (part of the privacy TODO).
- Capture stays on html-to-image, switched from `toPng` to `toCanvas`, `cacheBust` removed. snapDOM deferred: only revisit if capture remains the dominant bottleneck after the encoder swap. Capture goes behind a `captureFrame(el) → canvas` boundary so swapping later is trivial.
- MP4 (H.264/`avc`) only. WebM/VP9 option removed from `ExportOptions` and UI.
- `BufferTarget` → blob. Current save flow (`showSaveFilePicker` at start, `createWritable` at end, download fallback, "Descargar de nuevo") unchanged. `StreamTarget` rejected: output files are small (~8 MB real), not worth touching a verified flow.

## Architecture

Single interleaved loop per frame (no capture-all then encode-all phases):

1. `setManualProgress(p)` — existing deterministic manual render path.
2. Two RAFs + settle delay (as today).
3. `captureFrame(stageElement)` → html-to-image `toCanvas` with `width`/`height`/`pixelRatio`/`fontEmbedCSS`/`skipFonts`/`backgroundColor` as today, without `cacheBust`.
4. `canvasSource.add(i / fps, 1 / fps)` — Mediabunny encodes (hardware) while the loop captures the next frame.

Mediabunny objects: `Output` + `Mp4OutputFormat` + `BufferTarget`; `CanvasSource` with `codec: "avc"`, `hardwareAcceleration: "prefer-hardware"`. After the loop: `output.finalize()` → MP4 blob. No PNG step, no MEMFS, no frame accumulation in memory (only compressed video).

## Quality mapping

`quality` selector (fast/balanced/high) maps to Mediabunny presets: `QUALITY_MEDIUM` / `QUALITY_HIGH` / `QUALITY_VERY_HIGH` (bitrate-based; CRF does not exist in WebCodecs). Real file size still shown at the end, as today.

## Support check and errors

- Before starting: check an `avc` encoder exists for the target dimensions (Mediabunny support helper). If not, the dialog shows a clear error before any work happens.
- Cancel: the loop checks `cancelRef` between frames (encoding is per-frame; there is no long uninterruptible `exec`). On cancel, discard the output. `ffmpeg.terminate()` logic deleted.

## Progress / ETA

Phases reduce to: `rendering` (0→0.95, per frame) and `finalizing` (mux flush). `loading-ffmpeg` and separate `encoding` phases removed. `exportTiming.ts` (linear ETA) works unchanged.

## Fonts (first-class requirement)

Three font sources must survive capture:

- Google: `buildEmbeddedFontsCSS()` is kept as-is (fetches CSS + woff2 → data URLs → `fontEmbedCSS`, `skipFonts: true`).
- Custom uploads: `@font-face` with data URL injected by `FontLoader`; collected by html-to-image when `skipFonts` is false. Possible existing gap (unconfirmed): with a Google Font active, `skipFonts: true` may drop custom font faces from capture. Verification must include the custom+Google combo to confirm or discard.
- System: no embedding needed (raster uses local fonts; output differs on machines lacking the font — inherent to system fonts).

## Removals

- Deps `@ffmpeg/ffmpeg`, `@ffmpeg/util` (package.json, pnpm-workspace approvals if present).
- `FFMPEG_BASE_URL`, CRF `QUALITY_PRESETS`, MEMFS cleanup code, `loadFfmpeg`, webm branch.
- `format: "webm"` in `ExportOptions` and its UI in `ExportDialog`.

## Kept

- `buildEmbeddedFontsCSS` and the font-embed capture options.
- Deterministic `manualProgress` render path (export determinism fix of 2026-07-02).
- Save flow and "Descargar de nuevo" in `ExportDialog`.

## Testing

- Unit (Vitest, pure helpers): quality→preset mapping, per-frame timestamp/duration, progress calculation. WebCodecs/canvas out of unit scope (as FFmpeg was).
- Manual verification: same project exported before/after — duration, visual fidelity, all three font sources (including custom+Google combo), cancel mid-export, total export time compared.
