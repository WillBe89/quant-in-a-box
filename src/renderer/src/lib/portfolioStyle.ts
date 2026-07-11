import type { ComponentType } from 'react'
import {
  IconStocks,
  IconCrypto,
  IconBond,
  IconFx,
  IconRealEstate,
  IconSparkle,
  IconPortfolio,
  IconStar
} from '@renderer/components/icons/Icons'

export type PortfolioIconId = 'stocks' | 'crypto' | 'bond' | 'fx' | 'realEstate' | 'sparkle' | 'portfolio' | 'star'

export const PORTFOLIO_ICONS: Record<PortfolioIconId, ComponentType<{ size?: number; className?: string }>> = {
  stocks: IconStocks,
  crypto: IconCrypto,
  bond: IconBond,
  fx: IconFx,
  realEstate: IconRealEstate,
  sparkle: IconSparkle,
  portfolio: IconPortfolio,
  star: IconStar
}

export const PORTFOLIO_ICON_IDS = Object.keys(PORTFOLIO_ICONS) as PortfolioIconId[]

// Deliberately distinct from --gain/--loss/--warn (theme.css) so a portfolio's color never
// implies "up," "down," or "needs attention" — these are purely identity swatches. Kept to a
// different count than PORTFOLIO_ICON_IDS so the default icon+color pairing doesn't repeat
// until index 72 (lcm(8,9)), rather than every 8 portfolios.
export const PORTFOLIO_COLORS = [
  '#4f8ef0', // blue
  '#7c6cf0', // indigo
  '#b06be0', // violet
  '#e05bb8', // magenta
  '#35b8d9', // cyan
  '#6b7a99', // slate
  '#c9a227', // mustard
  '#2d8fb0', // teal-blue
  '#3d6bb3' // deep blue
]

export const DEFAULT_PORTFOLIO_ICON: PortfolioIconId = 'portfolio'
export const DEFAULT_PORTFOLIO_COLOR = PORTFOLIO_COLORS[0]

export function defaultStyleForPortfolio(index: number): { icon: PortfolioIconId; color: string } {
  return {
    icon: PORTFOLIO_ICON_IDS[index % PORTFOLIO_ICON_IDS.length],
    color: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]
  }
}

export function resolvePortfolioIcon(id?: string): ComponentType<{ size?: number; className?: string }> {
  if (id && id in PORTFOLIO_ICONS) return PORTFOLIO_ICONS[id as PortfolioIconId]
  return PORTFOLIO_ICONS[DEFAULT_PORTFOLIO_ICON]
}

export function resolvePortfolioColor(color?: string): string {
  return color || DEFAULT_PORTFOLIO_COLOR
}
