import { ALL_ASSETS } from '@renderer/data/mockData'
import type { Asset, Portfolio } from '@renderer/types/market'

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

/** Merges every position across every portfolio into one row per distinct symbol. Quantity is
 *  summed; cost basis is quantity-weighted across all contributions — the exact generalization
 *  of AppStateContext's addPosition blend formula (which for two contributions computes
 *  `(existing.quantity * existing.costBasis + quantity * costBasis) / totalQty`) to N
 *  contributions: `sum(quantity_i * costBasis_i) / sum(quantity_i)`. Row order is deterministic
 *  (first-seen symbol order across portfolios, then positions within each portfolio). An empty
 *  `portfolios` array, or portfolios that all have zero positions, returns []. */
export function mergePortfolioHoldings(
  portfolios: Portfolio[]
): Array<{ symbol: string; quantity: number; costBasis: number }> {
  const order: string[] = []
  const totals = new Map<string, { quantity: number; costTotal: number }>()

  for (const portfolio of portfolios) {
    for (const position of portfolio.positions) {
      const existing = totals.get(position.symbol)
      if (existing) {
        existing.quantity += position.quantity
        existing.costTotal += position.quantity * position.costBasis
      } else {
        totals.set(position.symbol, {
          quantity: position.quantity,
          costTotal: position.quantity * position.costBasis
        })
        order.push(position.symbol)
      }
    }
  }

  return order.map((symbol) => {
    const t = totals.get(symbol)!
    return { symbol, quantity: t.quantity, costBasis: t.quantity === 0 ? 0 : t.costTotal / t.quantity }
  })
}
