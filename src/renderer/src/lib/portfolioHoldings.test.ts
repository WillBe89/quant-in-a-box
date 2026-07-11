import { describe, expect, it } from 'vitest'
import { mergePortfolioHoldings, resolveHoldingRows } from './portfolioHoldings'
import type { Asset, Portfolio } from '@renderer/types/market'

function makePortfolio(
  id: string,
  positions: Array<{ symbol: string; quantity: number; costBasis: number }>
): Portfolio {
  return {
    id,
    name: id,
    positions: positions.map((p) => ({ ...p, addedAt: 0 }))
  }
}

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

describe('mergePortfolioHoldings', () => {
  it('blends a symbol held in two portfolios at different qty/cost using the exact addPosition formula', () => {
    const portfolios = [
      makePortfolio('p1', [{ symbol: 'AAA', quantity: 10, costBasis: 150 }]),
      makePortfolio('p2', [{ symbol: 'AAA', quantity: 5, costBasis: 180 }])
    ]

    const merged = mergePortfolioHoldings(portfolios)

    expect(merged).toHaveLength(1)
    const aaa = merged[0]
    expect(aaa.symbol).toBe('AAA')

    const existingQty = 10
    const existingCost = 150
    const quantity = 5
    const costBasis = 180
    const totalQty = existingQty + quantity
    // Same arithmetic as AppStateContext's addPosition blend formula — asserted here rather than
    // a hand-typed decimal so this test can't silently drift from the real formula.
    const blendedCost = (existingQty * existingCost + quantity * costBasis) / totalQty

    expect(aaa.quantity).toBe(totalQty)
    expect(aaa.quantity).toBe(15)
    expect(aaa.costBasis).toBeCloseTo(blendedCost, 10)
  })

  it('passes a symbol held in only one portfolio through unchanged', () => {
    const portfolios = [
      makePortfolio('p1', [{ symbol: 'AAA', quantity: 10, costBasis: 150 }]),
      makePortfolio('p2', [{ symbol: 'BBB', quantity: 5, costBasis: 180 }])
    ]

    const merged = mergePortfolioHoldings(portfolios)

    expect(merged).toHaveLength(2)
    const aaa = merged.find((m) => m.symbol === 'AAA')!
    const bbb = merged.find((m) => m.symbol === 'BBB')!
    expect(aaa).toEqual({ symbol: 'AAA', quantity: 10, costBasis: 150 })
    expect(bbb).toEqual({ symbol: 'BBB', quantity: 5, costBasis: 180 })
  })

  it('merges a symbol contributed by 3+ portfolios using sum(qty_i*cost_i)/sum(qty_i)', () => {
    const contributions = [
      { symbol: 'AAA', quantity: 10, costBasis: 150 },
      { symbol: 'AAA', quantity: 5, costBasis: 180 },
      { symbol: 'AAA', quantity: 2, costBasis: 200 }
    ]
    const portfolios = contributions.map((c, i) => makePortfolio(`p${i}`, [c]))

    const merged = mergePortfolioHoldings(portfolios)

    const totalQty = contributions.reduce((s, c) => s + c.quantity, 0)
    const expectedCost = contributions.reduce((s, c) => s + c.quantity * c.costBasis, 0) / totalQty

    expect(merged).toHaveLength(1)
    expect(merged[0].quantity).toBe(totalQty)
    expect(merged[0].costBasis).toBeCloseTo(expectedCost, 10)
  })

  it('returns [] for an empty portfolios array', () => {
    expect(mergePortfolioHoldings([])).toEqual([])
  })

  it('returns [] when every portfolio has zero positions', () => {
    const portfolios = [makePortfolio('p1', []), makePortfolio('p2', [])]
    expect(mergePortfolioHoldings(portfolios)).toEqual([])
  })

  it('contributes nothing from an empty-positions portfolio mixed with a non-empty one', () => {
    const portfolios = [makePortfolio('p1', []), makePortfolio('p2', [{ symbol: 'AAA', quantity: 4, costBasis: 20 }])]
    const merged = mergePortfolioHoldings(portfolios)
    expect(merged).toEqual([{ symbol: 'AAA', quantity: 4, costBasis: 20 }])
  })

  it('produces distinct rows in first-seen symbol order', () => {
    const portfolios = [
      makePortfolio('p1', [
        { symbol: 'BBB', quantity: 1, costBasis: 10 },
        { symbol: 'AAA', quantity: 1, costBasis: 10 }
      ]),
      makePortfolio('p2', [{ symbol: 'CCC', quantity: 1, costBasis: 10 }])
    ]
    const merged = mergePortfolioHoldings(portfolios)
    expect(merged.map((m) => m.symbol)).toEqual(['BBB', 'AAA', 'CCC'])
  })
})
