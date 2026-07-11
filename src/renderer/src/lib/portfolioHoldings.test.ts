import { describe, expect, it } from 'vitest'
import { resolveHoldingRows } from './portfolioHoldings'
import type { Asset } from '@renderer/types/market'

const AAA: Asset = { symbol: 'AAA', name: 'Asset A', klass: 'stocks', price: 100, changePct: 0 }
const BBB: Asset = { symbol: 'BBB', name: 'Asset B', klass: 'stocks', price: 50, changePct: 0 }
const ASSETS = [AAA, BBB]

describe('resolveHoldingRows', () => {
  it('computes marketValue/pnl/pnlPct/weightPct for a simple 2-position case', () => {
    const rows = resolveHoldingRows(
      [
        { symbol: 'AAA', quantity: 10, costBasis: 90 },
        { symbol: 'BBB', quantity: 20, costBasis: 60 }
      ],
      ASSETS
    )

    expect(rows).toHaveLength(2)

    const aaa = rows.find((r) => r.asset.symbol === 'AAA')!
    expect(aaa.marketValue).toBe(1000) // 100 * 10
    expect(aaa.costTotal).toBe(900) // 90 * 10
    expect(aaa.pnl).toBe(100) // 1000 - 900
    expect(aaa.pnlPct).toBeCloseTo((100 / 900) * 100, 10)
    expect(aaa.weightPct).toBeCloseTo(50, 10) // 1000 / 2000

    const bbb = rows.find((r) => r.asset.symbol === 'BBB')!
    expect(bbb.marketValue).toBe(1000) // 50 * 20
    expect(bbb.costTotal).toBe(1200) // 60 * 20
    expect(bbb.pnl).toBe(-200)
    expect(bbb.pnlPct).toBeCloseTo((-200 / 1200) * 100, 10)
    expect(bbb.weightPct).toBeCloseTo(50, 10)
  })

  it('skips a position whose symbol does not resolve in the provided assets list', () => {
    const rows = resolveHoldingRows(
      [
        { symbol: 'AAA', quantity: 10, costBasis: 90 },
        { symbol: 'ZZZ', quantity: 5, costBasis: 10 }
      ],
      ASSETS
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].asset.symbol).toBe('AAA')
    // Weight is computed only over resolved holdings, so the lone survivor is 100%.
    expect(rows[0].weightPct).toBe(100)
  })

  it('returns an empty array for an empty positions list', () => {
    expect(resolveHoldingRows([], ASSETS)).toEqual([])
  })

  it('gives a single position a weightPct of 100, not NaN', () => {
    const rows = resolveHoldingRows([{ symbol: 'AAA', quantity: 3, costBasis: 80 }], ASSETS)
    expect(rows).toHaveLength(1)
    expect(rows[0].weightPct).toBe(100)
    expect(Number.isNaN(rows[0].weightPct)).toBe(false)
  })
})
