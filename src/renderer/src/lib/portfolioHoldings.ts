import { ALL_ASSETS } from '@renderer/data/mockData'
import type { Asset } from '@renderer/types/market'

export interface ResolvedHoldingRow {
  asset: Asset
  quantity: number
  costBasis: number
  currentPrice: number
  marketValue: number
  costTotal: number
  pnl: number
  pnlPct: number
  weightPct: number
}

/** Joins raw portfolio positions to their current Asset data (price, name, etc.) and
 *  derives the per-holding value/P&L/weight figures the portfolio UI displays.
 *  Positions whose symbol doesn't resolve in `assets` are skipped entirely. Pure and
 *  synchronous — no fetching — so it's safe to call from render and to unit test directly. */
export function resolveHoldingRows(
  positions: Array<{ symbol: string; quantity: number; costBasis: number }>,
  assets: Asset[] = ALL_ASSETS
): ResolvedHoldingRow[] {
  const withAsset = positions
    .map((p) => {
      const asset = assets.find((a) => a.symbol === p.symbol)
      return asset ? { position: p, asset } : null
    })
    .filter((r): r is { position: (typeof positions)[number]; asset: Asset } => r !== null)

  const totalMarketValue = withAsset.reduce((sum, r) => sum + r.asset.price * r.position.quantity, 0)

  return withAsset.map(({ position, asset }) => {
    const marketValue = asset.price * position.quantity
    const costTotal = position.costBasis * position.quantity
    const pnl = marketValue - costTotal
    return {
      asset,
      quantity: position.quantity,
      costBasis: position.costBasis,
      currentPrice: asset.price,
      marketValue,
      costTotal,
      pnl,
      pnlPct: costTotal === 0 ? 0 : (pnl / costTotal) * 100,
      weightPct: totalMarketValue === 0 ? 0 : (marketValue / totalMarketValue) * 100
    }
  })
}
