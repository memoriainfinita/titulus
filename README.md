# Credit Titles Studio

Generador de títulos de crédito para vídeo (estilo créditos de película). Edición en vivo con vista previa y exportación a vídeo (MP4/WebM) desde el propio navegador.

Modos de presentación:
- **scroll**: créditos que se desplazan (estilo final de película).
- **appearing**: los elementos aparecen uno a uno con animación (fade, zoom, typewriter, etc.).

Soporta varias relaciones de aspecto (16:9, 21:9, 4:3, 9:16, 1:1), tipografía configurable (incluidas Google Fonts y fuentes personalizadas), colores/degradados, sombras y presets.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Zustand · Prisma + SQLite · FFmpeg-wasm + html-to-image.

## Requisitos

- Node.js (probado con v24)
- pnpm (probado con v11)

## Arranque

```bash
pnpm install
pnpm exec prisma generate
pnpm dev
```

App en http://localhost:3000.

> Los scripts de build nativos (Prisma, sharp, etc.) se autorizan en `pnpm-workspace.yaml` (`allowBuilds`).
> La ruta de la base de datos se define en `.env` (`DATABASE_URL`, p. ej. `file:./db/custom.db`).

## Estructura

- `src/app/page.tsx` — layout de 3 paneles: editor (izq), preview (centro), configuración (der).
- `src/components/credit/` — editor, preview, panel de configuración, gestor de fuentes, diálogo de exportación, render de scroll/aparición.
- `src/lib/credit/` — tipos, store (Zustand), fuentes y lógica de exportación de vídeo (`useVideoExport.ts`).
- `src/components/ui/` — componentes de shadcn/ui.

El estado de la app vive en cliente (Zustand). El esquema de Prisma (`User`/`Post`) es plantilla por defecto y no lo usa la app.
