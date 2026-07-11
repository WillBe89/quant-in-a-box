import { ASSET_CLASS_ORDER } from '@renderer/lib/assetClassStyle'
import type { Asset, AssetClass } from '@renderer/types/market'

export interface ClassBreakdownSlice {
  klass: AssetClass
  marketValue: number
  pct: number
}

/** Groups rows by asset.klass and returns each class's share of total market value, in the
 *  fixed stocks→crypto→bonds→fx→re display order. Classes with no rows (or zero value) are
 *  omitted rather than returned as zero-width slices. */
export function computeAssetClassBreakdown(rows: Array<{ asset: Asset; marketValue: number }>): ClassBreakdownSlice[] {
  const grandTotal = rows.reduce((sum, r) => sum + r.marketValue, 0)
  if (grandTotal === 0) return []

  const totalsByClass = new Map<AssetClass, number>()
  for (const row of rows) {
    totalsByClass.set(row.asset.klass, (totalsByClass.get(row.asset.klass) ?? 0) + row.marketValue)
  }

  const slices: ClassBreakdownSlice[] = []
  for (const klass of ASSET_CLASS_ORDER) {
    const marketValue = totalsByClass.get(klass) ?? 0
    if (marketValue === 0) continue
    slices.push({ klass, marketValue, pct: (marketValue / grandTotal) * 100 })
  }
  return slices
}

export interface RankedHolding {
  symbol: string | null
  isOther: boolean
  marketValue: number
  pct: number
}

/** Sorts rows by market value descending, keeping the top `topN` as individual entries and
 *  folding the remainder into a single trailing "Other" bucket. If rows.length <= topN, every
 *  row is returned individually with no Other bucket. */
export function rankHoldingsWithOther(
  rows: Array<{ asset: Asset; marketValue: number }>,
  topN: number = 8
): RankedHolding[] {
  if (rows.length === 0) return []

  const grandTotal = rows.reduce((sum, r) => sum + r.marketValue, 0)
  const sorted = [...rows].sort((a, b) => b.marketValue - a.marketValue)

  const toPct = (marketValue: number): number => (grandTotal === 0 ? 0 : (marketValue / grandTotal) * 100)

  if (sorted.length <= topN) {
    return sorted.map((r) => ({
      symbol: r.asset.symbol,
      isOther: false,
      marketValue: r.marketValue,
      pct: toPct(r.marketValue)
    }))
  }

  const top = sorted.slice(0, topN).map((r) => ({
    symbol: r.asset.symbol,
    isOther: false,
    marketValue: r.marketValue,
    pct: toPct(r.marketValue)
  }))

  const rest = sorted.slice(topN)
  const otherMarketValue = rest.reduce((sum, r) => sum + r.marketValue, 0)

  return [...top, { symbol: null, isOther: true, marketValue: otherMarketValue, pct: toPct(otherMarketValue) }]
}
