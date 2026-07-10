import { describe, expect, it } from 'vitest'
import { cumulativeValueSeries, weightedPortfolioReturns } from './portfolioMath'

describe('weightedPortfolioReturns', () => {
  it('blends holdings by weight at each time step', () => {
    const out = weightedPortfolioReturns([
      { weight: 0.5, returns: [0.1, 0.2] },
      { weight: 0.5, returns: [0.3, 0.4] }
    ])
    expect(out[0]).toBeCloseTo(0.2, 10)
    expect(out[1]).toBeCloseTo(0.3, 10)
  })

  it('truncates to the shortest series so misaligned lengths never index out of bounds', () => {
    const out = weightedPortfolioReturns([
      { weight: 0.5, returns: [0.1, 0.2, 0.3] },
      { weight: 0.5, returns: [0.1, 0.2] }
    ])
    expect(out).toHaveLength(2)
  })

  it('returns an empty series for an empty portfolio', () => {
    expect(weightedPortfolioReturns([])).toEqual([])
  })
})

describe('cumulativeValueSeries', () => {
  it('compounds returns starting from the base value', () => {
    const out = cumulativeValueSeries([0.1, -0.1], 1)
    expect(out[0]).toBe(1)
    expect(out[1]).toBeCloseTo(1.1, 10)
    expect(out[2]).toBeCloseTo(0.99, 10)
  })
})
