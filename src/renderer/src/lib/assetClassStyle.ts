import type { ComponentType } from 'react'
import { IconStocks, IconCrypto, IconBond, IconFx, IconRealEstate } from '@renderer/components/icons/Icons'
import type { AssetClass } from '@renderer/types/market'

/** Deliberately distinct from --gain/--loss/--warn: an asset class's color should never be
 *  read as "up"/"down"/"warning", so these are their own fixed palette. */
export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  stocks: '#4f8ef0',
  crypto: '#c9a227',
  bonds: '#3ed598',
  fx: '#8c7ef7',
  re: '#e05bb8'
}

export const ASSET_CLASS_ICONS: Record<AssetClass, ComponentType<{ size?: number; className?: string }>> = {
  stocks: IconStocks,
  crypto: IconCrypto,
  bonds: IconBond,
  fx: IconFx,
  re: IconRealEstate
}

export const ASSET_CLASS_ORDER: AssetClass[] = ['stocks', 'crypto', 'bonds', 'fx', 're']
