# Presets propios del usuario — diseño

## Objetivo

Permitir guardar y reutilizar configuraciones de aspecto propias, además de los 6 presets fijos existentes. Un preset captura solo el `config` (look), no el contenido ni las fuentes.

## Contexto actual

- `PresetBar` (`src/components/credit/ConfigPanel.tsx`) tiene 6 presets fijos en un array; cada uno aplica un `patch: Partial<CreditConfig>` vía `updateConfig`.
- La store (`src/lib/credit/store.ts`) persiste `items, config, fonts, projectName` en localStorage (zustand `persist`), con `merge` que backfillea config vía `mergePersistedConfig`.
- `exportProject` serializa `{ version, projectName, items, config, fonts }`.
- Componentes shadcn disponibles: `dropdown-menu`, `dialog`, `alert-dialog`.

## Decisiones

- Un preset captura **solo `config`** (snapshot completo de `CreditConfig`). No guarda items ni fuentes.
- UI: **menú desplegable propio** ("Mis presets"), separado de los 6 botones fijos.
- Persistencia: **locales al navegador** (localStorage vía zustand). NO viajan en el JSON de export de proyecto.
- Guardar: **diálogo con campo de nombre** (estilo `Dialog`). Nombre vacío (tras `trim`) no permitido.

## Modelo de datos

`src/lib/credit/types.ts`:

```ts
interface UserPreset {
  id: string
  name: string
  config: CreditConfig // snapshot completo del config en el momento de guardar
  createdAt: number
}
```

## Store

`src/lib/credit/store.ts`:

- Estado nuevo: `userPresets: UserPreset[]`, inicial `[]`.
- Acciones:
  - `saveUserPreset(name: string)`: crea `{ id: uuid(), name, config: { ...get().config }, createdAt: Date.now() }` y lo añade a `userPresets`.
  - `deleteUserPreset(id: string)`: filtra fuera el preset con ese id.
  - `applyUserPreset(id: string)`: busca el preset; si existe, `set({ config: { ...DEFAULT_CONFIG, ...preset.config } })`. El spread sobre `DEFAULT_CONFIG` backfillea claves de config añadidas después de guardar el preset (mismo criterio que `mergePersistedConfig`).
- Persistencia:
  - `partialize`: añadir `userPresets: state.userPresets`.
  - `merge`: backfill `userPresets: p.userPresets ?? []`.
  - `userPresets` NO se añade a `exportProject`.

## UI

`src/components/credit/ConfigPanel.tsx`, en/junto a `PresetBar`:

- Los 6 botones fijos quedan igual.
- Botón nuevo **"Mis presets"** que abre un `DropdownMenu`:
  - Por cada preset propio: ítem con el nombre (clic → `applyUserPreset(id)`) y un icono `x` a la derecha (clic → `deleteUserPreset(id)`, sin cerrar inadvertidamente / sin aplicar).
  - Lista vacía: ítem atenuado no interactivo "Sin presets guardados".
  - Separador + ítem **"Guardar actual…"** → abre un `Dialog` con input de nombre y botón Guardar. El botón se deshabilita si el nombre con `trim` está vacío. Guardar → `saveUserPreset(name.trim())` y cierra el diálogo.

## Tests

`src/lib/credit/store.test.ts` (patrón de reducers ya establecido):

- `saveUserPreset` añade un preset cuyo `config` iguala al `config` actual de la store.
- `applyUserPreset` deja `config` igual al guardado; con una clave eliminada del preset guardado, esa clave queda con su valor de `DEFAULT_CONFIG` (backfill).
- `deleteUserPreset` elimina el preset por id.
- Roundtrip de persistencia: un estado persistido sin `userPresets` rehidrata a `[]` (vía `merge`); un estado con `userPresets` los conserva.

## Fuera de alcance (YAGNI)

- Renombrar o reordenar presets.
- Exportar/importar presets entre navegadores.
- Incluir items o fuentes en un preset.
