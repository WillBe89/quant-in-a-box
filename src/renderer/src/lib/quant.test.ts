import { describe, expect, it } from 'vitest'
import {
  beta,
  blackScholes,
  bollingerBands,
  closesOf,
  dailyReturns,
  ema,
  historicalVaR,
  macd,
  maxDrawdown,
  rsi,
  sharpeRatio,
  sma,
  sortinoRatio,
  stddev,
  volatilityAnnualized
} from './quant'

describe('sma', () => {
  it('returns null until the window fills, then the running average', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })
})

describe('ema', () => {
  it('seeds with the first value', () => {
    const out = ema([10, 10, 10], 5)
    expect(out[0]).toBe(10)
    expect(out[2]).toBeCloseTo(10, 6)
  })

  it('weights recent values more heavily than a plain average would', () => {
    const out = ema([10, 10, 10, 10, 100], 3)
    // k = 2/(3+1) = 0.5, so the jump to 100 should pull the EMA well above the
    // plain average of the series (28) but not all the way to 100.
    const plainAverage = 28
    expect(out[4]).toBeGreaterThan(plainAverage)
    expect(out[4]).toBeLessThan(100)
  })
})

describe('stddev', () => {
  it('is zero for a constant series', () => {
    expect(stddev([5, 5, 5, 5])).toBe(0)
  })

  it('matches the textbook population stdev example', () => {
    // Classic example: mean 5, population stdev 2.
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 6)
  })
})

describe('dailyReturns', () => {
  it('computes simple period-over-period returns', () => {
    const returns = dailyReturns([100, 110, 99])
    expect(returns[0]).toBeCloseTo(0.1, 6)
    expect(returns[1]).toBeCloseTo(-0.1, 6)
  })
})

describe('volatilityAnnualized', () => {
  it('scales stdev by sqrt(periodsPerYear)', () => {
    const returns = [0.01, -0.01, 0.01, -0.01]
    expect(volatilityAnnualized(returns, 252)).toBeCloseTo(stddev(returns) * Math.sqrt(252), 8)
  })
})

describe('sharpeRatio', () => {
  it('is zero when volatility is zero rather than dividing by zero', () => {
    expect(sharpeRatio([0, 0, 0, 0])).toBe(0)
  })

  it('is positive for a series of consistent positive returns', () => {
    expect(sharpeRatio([0.001, 0.002, 0.0015, 0.0012])).toBeGreaterThan(0)
  })
})

describe('sortinoRatio', () => {
  it('is zero when there is no downside volatility', () => {
    expect(sortinoRatio([0.01, 0.02, 0.01, 0.015])).toBe(0)
  })

  it('is more forgiving than Sharpe when volatility is mostly upside', () => {
    // Downside returns (-0.01, -0.03) must actually vary, or downside deviation
    // is zero and Sortino short-circuits to 0 by design (see the zero-volatility test above).
    const returns = [0.05, -0.01, 0.06, -0.03, 0.05]
    expect(sortinoRatio(returns)).toBeGreaterThan(sharpeRatio(returns))
  })
})

describe('maxDrawdown', () => {
  it('finds the largest peak-to-trough decline', () => {
    // Peak 120 -> trough 80 is the worst drawdown, -33.33%.
    expect(maxDrawdown([100, 120, 80, 90])).toBeCloseTo(-1 / 3, 6)
  })

  it('is zero for a monotonically rising series', () => {
    expect(maxDrawdown([1, 2, 3, 4, 5])).toBe(0)
  })
})

describe('historicalVaR', () => {
  it('picks the loss threshold at the given confidence percentile', () => {
    const returns = [-0.05, -0.03, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06]
    // 95% VaR on 10 sorted observations -> floor(0.05 * 10) = index 0 -> worst observation.
    expect(historicalVaR(returns, 0.95)).toBe(-0.05)
  })
})

describe('beta', () => {
  it('is 1 when an asset moves identically to the market', () => {
    const market = [0.01, -0.02, 0.03, -0.01, 0.02]
    expect(beta(market, market)).toBeCloseTo(1, 6)
  })

  it('scales linearly with amplified moves', () => {
    const market = [0.01, -0.02, 0.03, -0.01, 0.02]
    const amplified = market.map((r) => r * 2)
    expect(beta(amplified, market)).toBeCloseTo(2, 6)
  })
})

describe('bollingerBands', () => {
  it('is symmetric around the midline', () => {
    const closes = [10, 11, 9, 12, 8, 13, 7, 14, 10, 11, 9, 12, 8, 13, 7, 14, 10, 11, 9, 12]
    const { mid, upper, lower } = bollingerBands(closes, 20, 2)
    const i = closes.length - 1
    expect((upper[i] as number) - (mid[i] as number)).toBeCloseTo((mid[i] as number) - (lower[i] as number), 6)
  })
})

describe('rsi', () => {
  it('approaches 100 for a strictly increasing series (no losses)', () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i)
    const values = rsi(closes, 14)
    expect(values[values.length - 1]).toBe(100)
  })
})

describe('macd', () => {
  it('is flat (near zero) for a constant price series', () => {
    const closes = Array(40).fill(100)
    const { histogram } = macd(closes)
    expect(histogram[histogram.length - 1]).toBeCloseTo(0, 6)
  })
})

describe('blackScholes', () => {
  it('matches the classic textbook ATM call example (S=K=100, T=1, r=5%, sigma=20%)', () => {
    const result = blackScholes(100, 100, 1, 0.05, 0.2, 'call')
    expect(result.price).toBeCloseTo(10.45, 1)
    expect(result.delta).toBeCloseTo(0.6368, 3)
  })

  it('respects put-call parity: call - put = S - K*e^(-rT)', () => {
    const S = 100
    const K = 95
    const T = 0.5
    const r = 0.03
    const sigma = 0.25
    const call = blackScholes(S, K, T, r, sigma, 'call')
    const put = blackScholes(S, K, T, r, sigma, 'put')
    expect(call.price - put.price).toBeCloseTo(S - K * Math.exp(-r * T), 4)
  })

  it('falls back to intrinsic value at zero time-to-expiry', () => {
    expect(blackScholes(110, 100, 0, 0.05, 0.2, 'call').price).toBeCloseTo(10, 6)
    expect(blackScholes(90, 100, 0, 0.05, 0.2, 'put').price).toBeCloseTo(10, 6)
  })
})

describe('closesOf', () => {
  it('extracts the close field from a candle series', () => {
    const candles = [
      { time: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
      { time: 2, open: 1.5, high: 2.5, low: 1, close: 2, volume: 12 }
    ]
    expect(closesOf(candles)).toEqual([1.5, 2])
  })
})
