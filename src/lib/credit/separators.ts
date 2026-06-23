// Pure resolution helpers for spacer/divider items.
// Override per item when set to a valid value, otherwise the global config value.
// Mirrors the resolveItemPause pattern in appearing.ts.

import { CreditItem, CreditConfig, DividerStyle } from "./types"

function resolveNumber(override: number | undefined, fallback: number): number {
  return typeof override === "number" && override >= 0 ? override : fallback
}

export function resolveSpacerHeight(item: CreditItem, config: CreditConfig): number {
  return resolveNumber(item.spacerHeight, config.spacerHeight)
}

export interface ResolvedDivider {
  thickness: number
  width: number
  opacity: number
  style: DividerStyle
  color: string
}

export function resolveDivider(item: CreditItem, config: CreditConfig): ResolvedDivider {
  const itemColor = item.dividerColor?.trim()
  const globalColor = config.dividerColor?.trim()
  const color = itemColor ? itemColor : globalColor ? globalColor : config.textColor
  return {
    thickness: resolveNumber(item.dividerThickness, config.dividerThickness),
    width: resolveNumber(item.dividerWidth, config.dividerWidth),
    opacity: resolveNumber(item.dividerOpacity, config.dividerOpacity),
    style: item.dividerStyle ?? config.dividerStyle,
    color,
  }
}
