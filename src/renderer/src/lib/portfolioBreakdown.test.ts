import { describe, expect, it } from 'vitest'
import { computeAssetClassBreakdown, rankHoldingsWithOther } from './portfolioBreakdown'
import type { Asset } from '@renderer/types/market'

const STOCK_A: Asset = { symbol: 'AAA', name: 'Asset A', klass: 'stocks', price: 100, changePct: 0 }
const STOCK_B: Asset = { symbol: 'BBB', name: 'Asset B', klass: 'stocks', price: 100, changePct: 0 }
const CRYPTO_A: Asset = { symbol: 'CCC', name: 'Asset C', klass: 'crypto', price: 100, changePct: 0 }
const BOND_A: Asset = { symbol: 'DDD', name: 'Asset D', klass: 'bonds', price: 100, changePct: 0 }

describe('computeAssetClassBreakdown', () => {
  it('sums percentages to ~100 for a multi-class input', () => {
    const slices = computeAssetClassBreakdown([
      { asset: STOCK_A, marketValue: 300 },
      { asset: CRYPTO_A, marketValue: 500 },
      { asset: BOND_A, marketValue: 200 }
    ])
    const total = slices.reduce((sum, s) => sum + s.pct, 0)
    expect(total).toBeCloseTo(100, 2)
    expect(slices.map((s) => s.klass)).toEqual(['stocks', 'crypto', 'bonds'])
  })

  it('returns a single 100% slice for single-class input', () => {
    const slices = computeAssetClassBreakdown([
      { asset: STOCK_A, marketValue: 400 },
      { asset: STOCK_B, marketValue: 600 }
    ])
    expect(slices).toHaveLength(1)
    expect(slices[0].klass).toBe('stocks')
    expect(slices[0].pct).toBeCloseTo(100, 2)
    expect(slices[0].marketValue).toBe(1000)
  })

  it('returns an empty array for empty input', () => {
    expect(computeAssetClassBreakdown([])).toEqual([])
  })

  it('does not include a class with all its rows removed as a 0% entry', () => {
    // No fx/re/bonds rows at all - only stocks and crypto present.
    const slices = computeAssetClassBreakdown([
      { asset: STOCK_A, marketValue: 100 },
      { asset: CRYPTO_A, marketValue: 100 }
    ])
    expect(slices.some((s) => s.klass === 'bonds')).toBe(false)
    expect(slices.some((s) => s.klass === 'fx')).toBe(false)
    expect(slices.some((s) => s.klass === 're')).toBe(false)
    expect(slices).toHaveLength(2)
  })
})

function makeRows(values: number[]): Array<{ asset: Asset; marketValue: number }> {
  return values.map((marketValue, i) => ({
    asset: { symbol: `S${i}`, name: `Sym ${i}`, klass: 'stocks', price: 1, changePct: 0 },
    marketValue
  }))
}

describe('rankHoldingsWithOther', () => {
  it('returns no Other bucket when rows.length === topN', () => {
    const rows = makeRows([10, 20, 30, 40, 50, 60, 70, 80])
    const ranked = rankHoldingsWithOther(rows, 8)
    expect(ranked).toHaveLength(8)
    expect(ranked.some((r) => r.isOther)).toBe(false)
  })

  it('returns topN individual entries plus exactly one Other bucket for topN+1 rows', () => {
    const rows = makeRows([10, 20, 30, 40, 50, 60, 70, 80, 5])
    const ranked = rankHoldingsWithOther(rows, 8)
    expect(ranked).toHaveLength(9)
    const otherEntries = ranked.filter((r) => r.isOther)
    expect(otherEntries).toHaveLength(1)
    expect(otherEntries[0].marketValue).toBe(5)
    expect(otherEntries[0].symbol).toBeNull()
    const individual = ranked.filter((r) => !r.isOther)
    expect(individual).toHaveLength(8)
    // Sorted descending by market value.
    expect(individual.map((r) => r.marketValue)).toEqual([80, 70, 60, 50, 40, 30, 20, 10])
  })

  it("Other bucket's marketValue equals the sum of the excluded rows", () => {
    const rows = makeRows([100, 90, 80, 70, 60, 50, 40, 30, 20, 10])
    const ranked = rankHoldingsWithOther(rows, 8)
    const other = ranked.find((r) => r.isOther)!
    expect(other.marketValue).toBe(20 + 10)
  })

  it('returns all rows individually when fewer than topN', () => {
    const rows = makeRows([10, 20, 30])
    const ranked = rankHoldingsWithOther(rows, 8)
    expect(ranked).toHaveLength(3)
    expect(ranked.some((r) => r.isOther)).toBe(false)
  })

  it('returns an empty array for empty input', () => {
    expect(rankHoldingsWithOther([], 8)).toEqual([])
  })
})
