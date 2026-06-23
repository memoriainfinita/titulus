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
- 2026-06-22: extraído tar de z.ai. `.env` corregido (`DATABASE_URL` a `file:./db/custom.db`). Migrado de npm a pnpm. Script `dev` arreglado (quitado `| tee dev.log`). Builds aprobados vía `pnpm-workspace.yaml`. App arrancada OK (HTTP 200). Git iniciado limpio en `app/` (historial z.ai descartado por decisión del usuario). Commit inicial `7e0db66`.
- 2026-06-22: arreglado scroll de paneles izq/der con `min-h-0` en `ScrollArea` (`ConfigPanel.tsx`, `CreditEditor.tsx`). Commit `eb2f4cf`. Añadidos al TODO los features/bugs pedidos por el usuario (timing por item, presets propios, modo oscuro, timeline, control de fade, retardo inicial de scroll, lentitud de exportación, botones de navegación visibles en el vídeo, auditoría de privacidad). Log de sesión en `state.md` commit `2e6473f`.
- 2026-06-22: eliminada dependencia muerta `z-ai-web-dev-sdk` (no se importaba); lockfile actualizado. Commit `195cf4b`. Creado `README.md` del proyecto. Commit `1a6abee`.
- 2026-06-23: arreglado bug del primer texto en scroll (eliminado padding superior duplicado en `ScrollCredits.tsx`). Implementado modo oscuro de la UI con `next-themes` (`theme-provider.tsx`, `theme-toggle.tsx`, wrap en `layout.tsx`, toggle en `page.tsx`). Verificado en navegador (HTTP 200, sin errores de compilación). Bug de controles en el vídeo confirmado no reproducible por el usuario. Triage de TODOs: `scrollSpeed` y fuentes custom ya estaban implementados. Nuevos TODO: tests con Vitest, resolución de export elegible. Errores de `tsc` preexistentes en `useVideoExport.ts`/`CreditPreview.tsx`/`examples` (no introducidos esta sesión).

- 2026-06-23: implementada pausa personalizada por item en modo appearing. Campo opcional `pauseOverride` en `CreditItem` (`types.ts`). Lógica de duración des-duplicada y extraída a módulo puro `src/lib/credit/appearing.ts` (`getAppearItemDuration` + `resolveItemPause`); `AppearingCredits.tsx` ahora la consume en vez de repetir el cálculo inline. UI: input "Pausa (s)" + badge en `CreditEditor.tsx`, visibles solo en modo appearing. Tests: nuevo `appearing.test.ts` (7) + caso roundtrip de `pauseOverride` en `store.test.ts`; 42 verdes. Eliminado el bloque `"pnpm"` inerte de `package.json`. Caché `.next` corrupta (TurbopackInternalError "Failed to write app endpoint", agravado por "Slow filesystem detected" en D:) borrada y dev server reiniciado limpio en :3000 (HTTP 200). Verificado en navegador por el usuario.

## TODO
- [x] Paneles izquierdo y derecho sin barra de scroll: resuelto con `min-h-0` en las dos `ScrollArea` (`ConfigPanel.tsx`, `CreditEditor.tsx`).
- [x] Quitar el bloque `"pnpm"` inerte de `package.json` (resuelto 2026-06-23): eliminado; la aprobación de builds la cubre `pnpm-workspace.yaml`.

### Tests (2026-06-23)
- [x] Montado Vitest 4 + happy-dom. Scripts `test`/`test:run`, `vitest.config.ts` (alias `@`). Geometría del scroll extraída a `src/lib/credit/scroll.ts` (puro) y usada en `ScrollCredits.tsx`. 34 tests verdes en `scroll.test.ts`, `store.test.ts` (helpers + reducers + roundtrip import/export), `fonts.test.ts`. UI/FFmpeg/drag&drop fuera del alcance unit.

### Investigar / features pendientes (pedidos 2026-06-22)
- [~] Tiempos personalizados por título. Implementado 2026-06-23 para modo appearing: campo opcional `pauseOverride` en `CreditItem` que sobreescribe la pausa (hold) por item; la duración de animación sigue global. Pendiente: equivalente en modo scroll (no abordado por decisión de alcance).
- [x] Velocidad de scroll: slider `scrollSpeed` (10-300 px/s) operativo en `ConfigPanel` y aplicado en `ScrollCredits`. Verificado 2026-06-23.
- [x] Fuentes personalizadas: `FontManager` completo (catálogo Google Fonts, subida ttf/otf/woff con `@font-face`, activar/eliminar). Verificado 2026-06-23.
- [x] Modo oscuro: implementado 2026-06-23. `next-themes` con `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) en `layout.tsx`, toggle sol/luna (`theme-toggle.tsx`) en el header. Tematiza la UI del editor; el fondo del escenario sigue siendo configurable aparte.
- [ ] Modo appearing: los círculos indicadores de progreso (puntos en la parte inferior, bloque "Progress indicator" de `AppearingCredits.tsx`) se ven durante el pase de diapositivas. Decidir si ocultarlos (al menos en el vídeo exportado) o hacerlos opcionales.
- [ ] Presets propios del usuario: actualmente solo presets fijos en `PresetBar`. No hay guardar/cargar propios.
- [ ] Línea de tiempo (timeline) para navegación mientras se editan los créditos. No existe.
- [ ] Control de los tiempos de fade.
- [x] Bug: en modo scroll tarda mucho hasta que aparece el primer texto. Resuelto 2026-06-23: había un offset doble (translateY inicial + padding superior de `containerHeight`); eliminado el padding superior en `ScrollCredits.tsx`. `config.startDelay` sigue sin usarse (código muerto).
- [ ] Resolución de exportación no elegible: la salida usa `config.stageWidth × stageHeight` (fijado por `stageRatio`), con `pixelRatio: 1` clavado en `useVideoExport.ts`. En 16:9 siempre 720p. Añadir selector de resolución (720p/1080p/1440p/4K) en `ExportDialog`, escalando vía `pixelRatio` y dimensiones pares (lo exige yuv420p de H.264). Subir resolución agrava la lentitud (1080p ~2,25×, 4K ~9×); valorar atacar antes el rendimiento.
- [ ] Exportación muy lenta (estimaba ~1 min, llega a >5 min). Enfoque actual en `useVideoExport.ts`: captura frame a frame con `html-to-image` (`toPng` por fotograma) + FFmpeg-wasm; lento por diseño. Referencia del usuario: en app previa "sequentia" era mucho más rápido. Investigar alternativa (hipótesis: `MediaRecorder` + `canvas.captureStream()` en tiempo real).
- [x] Bug: en el vídeo exportado se ven los botones de navegación. No reproducible 2026-06-23: el export captura `exportStageRef` (escenario oculto sin controles); el usuario confirmó MP4 limpio tras recompilar. La captura previa con controles era de un build anterior.
- [ ] Privacidad / envío de datos a terceros. Revisión inicial 2026-06-22: sin analytics ni telemetría; `z-ai-web-dev-sdk` se eliminó (dependencia muerta, no se importaba). Únicas conexiones externas (GET, no envían contenido del usuario): `unpkg.com` (FFmpeg core, al exportar) y `fonts.googleapis.com`/`fonts.gstatic.com` (Google Fonts). Pendiente: auditoría más a fondo y decidir si self-hostear FFmpeg y fuentes para no contactar terceros.
