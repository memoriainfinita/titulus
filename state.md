# Credit Titles Studio — state

## Proyecto
- Generador de títulos de crédito para vídeo. Origen: app generada por z.ai, descargada como `.tar`.
- Ubicación repo/proyecto: `D:\DOCS\CODELAB\1_in-progress\credits app\app`. El `.tar` original queda en la carpeta padre.

## Stack
- Next.js 16.2.9 (Turbopack), React 19, TypeScript, Tailwind 4, shadcn/ui, Zustand, Prisma + SQLite, FFmpeg-wasm + html-to-image.
- Gestor: pnpm 11.1.1 (Node v24.9.0). Diseñado originalmente para Bun (no instalado en esta máquina).

## Arranque
- `pnpm install` (requiere builds aprobados, ver Patterns) → `pnpm exec prisma generate` → `pnpm dev`.
- Dev server: http://localhost:3000.

## Arquitectura
- Layout de 3 paneles (`src/app/page.tsx`): `CreditEditor` (izq), `CreditPreview` (centro), `ConfigPanel` (der).
- Lógica de créditos en `src/lib/credit/` y `src/components/credit/`. Modos: `scroll` y `appearing`.
- Estado real en cliente con Zustand. Prisma trae esquema por defecto (`User`/`Post`) no usado por la app.
- Exportación de vídeo (`src/lib/credit/useVideoExport.ts`): captura frames con html-to-image y codifica con FFmpeg-wasm en el navegador.

## Patterns
- [pnpm] Builds nativos (prisma, sharp, swc, parcel/watcher, etc.) se aprueban en `pnpm-workspace.yaml` con `allowBuilds: <pkg>: true`. El bloque `"pnpm"` de `package.json` no lo lee pnpm 11. Confirmed 2026-06.
- [windows] Scripts npm con `| tee` fallan al lanzarse con pnpm en Windows (cmd.exe no tiene `tee`). Confirmed 2026-06.

## History
- 2026-06-22: extraído tar de z.ai. `.env` corregido (`DATABASE_URL` a `file:./db/custom.db`). Migrado de npm a pnpm. Script `dev` arreglado (quitado `| tee dev.log`). Builds aprobados vía `pnpm-workspace.yaml`. App arrancada OK (HTTP 200). Git iniciado limpio en `app/` (historial z.ai descartado por decisión del usuario).

## TODO
- [x] Paneles izquierdo y derecho sin barra de scroll: resuelto con `min-h-0` en las dos `ScrollArea` (`ConfigPanel.tsx`, `CreditEditor.tsx`).
- [ ] Decidir si quitar el bloque `"pnpm"` inerte de `package.json`.

### Investigar / features pendientes (pedidos 2026-06-22)
- [ ] Tiempos personalizados por título (duración individual de cada item). `CreditItem` no tiene campo de tiempo.
- [ ] Velocidad de scroll: existe slider `scrollSpeed` en `ConfigPanel`. Verificar si cubre lo que se quiere.
- [ ] Fuentes personalizadas: existe `FontManager` y `source: "custom"` en `types.ts`. Verificar alcance real.
- [ ] Modo oscuro: `next-themes` está en dependencias. Verificar si hay toggle implementado.
- [ ] Presets propios del usuario: actualmente solo presets fijos en `PresetBar`. No hay guardar/cargar propios.
- [ ] Línea de tiempo (timeline) para navegación mientras se editan los créditos. No existe.
- [ ] Control de los tiempos de fade.
- [ ] Bug: en modo scroll tarda mucho hasta que aparece el primer texto.
- [ ] Privacidad / envío de datos a terceros. Revisión inicial 2026-06-22: sin analytics ni telemetría; `z-ai-web-dev-sdk` está en deps pero no se importa (dependencia muerta, eliminable). Únicas conexiones externas (GET, no envían contenido del usuario): `unpkg.com` (FFmpeg core, al exportar) y `fonts.googleapis.com`/`fonts.gstatic.com` (Google Fonts). Pendiente: auditoría más a fondo y decidir si self-hostear FFmpeg y fuentes para no contactar terceros.
