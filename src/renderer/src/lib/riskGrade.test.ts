import { describe, expect, it } from 'vitest'
import { computeRiskGrade } from './riskGrade'
import type { ClassBreakdownSlice } from './portfolioBreakdown'
import type { PortfolioRiskStats } from '@renderer/types/market'

function stats(overrides: Partial<PortfolioRiskStats>): PortfolioRiskStats {
  return {
    sharpe: 1.2,
    sortino: 1.6,
    volatilityAnnualized: 0.1,
    valueAtRisk95: -0.01,
    maxDrawdown: -0.05,
    beta: 1.0,
    ...overrides
  }
}

// Diversification fixtures, chosen against riskGrade's own thresholds (length<=1 or
// largest>=80 => bad; length>=3 and largest<=60 => good; otherwise neutral).
const DIVERSIFIED_GOOD: ClassBreakdownSlice[] = [
  { klass: 'stocks', marketValue: 400, pct: 40 },
  { klass: 'crypto', marketValue: 350, pct: 35 },
  { klass: 'bonds', marketValue: 250, pct: 25 }
]
const DIVERSIFIED_NEUTRAL: ClassBreakdownSlice[] = [
  { klass: 'stocks', marketValue: 500, pct: 50 },
  { klass: 'crypto', marketValue: 500, pct: 50 }
]
const DIVERSIFIED_BAD_CONCENTRATED: ClassBreakdownSlice[] = [
  { klass: 'stocks', marketValue: 900, pct: 90 },
  { klass: 'crypto', marketValue: 100, pct: 10 }
]
const SINGLE_CLASS: ClassBreakdownSlice[] = [{ klass: 'stocks', marketValue: 1000, pct: 100 }]

describe('computeRiskGrade', () => {
  it('boundary: score 25 (moderate) vs score 23 (conservative), right at the 24/25 edge', () => {
    // vol neutral (0.25) + maxdd neutral (-0.2) + div good + var good + beta good
    // weightedSum = 2.5 + 2.5 + 0 + 0 + 0 = 5 -> score 25
    const atEdge = computeRiskGrade(
      stats({ volatilityAnnualized: 0.25, maxDrawdown: -0.2, valueAtRisk95: -0.01, beta: 1.0 }),
      DIVERSIFIED_GOOD
    )
    expect(atEdge.score).toBe(25)
    expect(atEdge.category).toBe('moderate')

    // vol neutral (0.25) + maxdd good + div good + var good + beta bad (2.0)
    // weightedSum = 2.5 + 0 + 0 + 0 + 2 = 4.5 -> score round(22.5) = 23
    const justBelow = computeRiskGrade(
      stats({ volatilityAnnualized: 0.25, maxDrawdown: -0.05, valueAtRisk95: -0.01, beta: 2.0 }),
      DIVERSIFIED_GOOD
    )
    expect(justBelow.score).toBe(23)
    expect(justBelow.category).toBe('conservative')
  })

  it('boundary: score 50 (elevated) vs score 48 (moderate), right at the 49/50 edge', () => {
    // vol bad (0.4) + maxdd neutral (-0.2) + div neutral + var good + beta good
    // weightedSum = 5 + 2.5 + 2.5 + 0 + 0 = 10 -> score 50
    const atEdge = computeRiskGrade(
      stats({ volatilityAnnualized: 0.4, maxDrawdown: -0.2, valueAtRisk95: -0.01, beta: 1.0 }),
      DIVERSIFIED_NEUTRAL
    )
    expect(atEdge.score).toBe(50)
    expect(atEdge.category).toBe('elevated')

    // vol neutral (0.25) + maxdd neutral (-0.2) + div neutral + var good + beta bad (2.0)
    // weightedSum = 2.5 + 2.5 + 2.5 + 0 + 2 = 9.5 -> score round(47.5) = 48
    const justBelow = computeRiskGrade(
      stats({ volatilityAnnualized: 0.25, maxDrawdown: -0.2, valueAtRisk95: -0.01, beta: 2.0 }),
      DIVERSIFIED_NEUTRAL
    )
    expect(justBelow.score).toBe(48)
    expect(justBelow.category).toBe('moderate')
  })

  it('boundary: score 75 (high) vs score 73 (elevated), right at the 74/75 edge', () => {
    // vol bad (0.4) + maxdd bad (-0.35) + div bad (concentrated, not single-class) + var good + beta good
    // weightedSum = 5 + 5 + 5 + 0 + 0 = 15 -> score 75
    const atEdge = computeRiskGrade(
      stats({ volatilityAnnualized: 0.4, maxDrawdown: -0.35, valueAtRisk95: -0.01, beta: 1.0 }),
      DIVERSIFIED_BAD_CONCENTRATED
    )
    expect(atEdge.score).toBe(75)
    expect(atEdge.category).toBe('high')

    // vol bad (0.4) + maxdd bad (-0.35) + div neutral + var good + beta bad (2.0)
    // weightedSum = 5 + 5 + 2.5 + 0 + 2 = 14.5 -> score round(72.5) = 73
    const justBelow = computeRiskGrade(
      stats({ volatilityAnnualized: 0.4, maxDrawdown: -0.35, valueAtRisk95: -0.01, beta: 2.0 }),
      DIVERSIFIED_NEUTRAL
    )
    expect(justBelow.score).toBe(73)
    expect(justBelow.category).toBe('elevated')
  })

  it('a good beta cannot launder away bad volatility + bad maxdd + bad diversification', () => {
    const grade = computeRiskGrade(
      stats({
        volatilityAnnualized: 0.4, // bad (> 0.35)
        maxDrawdown: -0.35, // bad (< -0.3)
        valueAtRisk95: -0.03, // neutral, kept out of the picture
        beta: 1.0 // good (within 0.3 of 1.0)
      }),
      DIVERSIFIED_BAD_CONCENTRATED // bad (largest slice 90% >= 80%)
    )
    expect(grade.signals.beta).toBe('good')
    expect(grade.signals.volatility).toBe('bad')
    expect(grade.signals.maxdd).toBe('bad')
    expect(grade.signals.diversification).toBe('bad')
    expect(['elevated', 'high']).toContain(grade.category)
    expect(grade.score).toBeGreaterThanOrEqual(50)
  })

  it('a single-asset-class portfolio floors at score >= 60 even with otherwise-tame stats', () => {
    const grade = computeRiskGrade(
      stats({
        volatilityAnnualized: 0.05, // good
        maxDrawdown: -0.02, // good
        valueAtRisk95: -0.005, // good
        beta: 1.0 // good
      }),
      SINGLE_CLASS
    )
    expect(grade.signals.volatility).toBe('good')
    expect(grade.signals.maxdd).toBe('good')
    expect(grade.signals.var).toBe('good')
    expect(grade.signals.beta).toBe('good')
    expect(grade.signals.diversification).toBe('bad')
    expect(grade.score).toBeGreaterThanOrEqual(60)
    expect(['elevated', 'high']).toContain(grade.category)
  })

  it('the empty-portfolio guard does not throw and returns a sensible default', () => {
    expect(() => computeRiskGrade(stats({}), [])).not.toThrow()
    const grade = computeRiskGrade(stats({}), [])
    expect(grade.score).toBe(0)
    expect(grade.category).toBe('conservative')
    expect(grade.signals).toEqual({
      volatility: 'neutral',
      maxdd: 'neutral',
      diversification: 'neutral',
      var: 'neutral',
      beta: 'neutral'
    })
  })

  it('a well-diversified, low-volatility portfolio lands conservative', () => {
    const grade = computeRiskGrade(
      stats({
        volatilityAnnualized: 0.1,
        maxDrawdown: -0.05,
        valueAtRisk95: -0.01,
        beta: 1.0
      }),
      DIVERSIFIED_GOOD
    )
    expect(grade.signals.diversification).toBe('good')
    expect(grade.score).toBe(0)
    expect(grade.category).toBe('conservative')
  })
})
