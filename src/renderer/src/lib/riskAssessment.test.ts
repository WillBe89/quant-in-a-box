import { describe, expect, it } from 'vitest'
import { assessRisk } from './riskAssessment'

describe('assessRisk', () => {
  it('sharpe: boundary at 1.0 is good, just under is neutral, negative is bad', () => {
    expect(assessRisk('sharpe', 1.0).tone).toBe('good')
    expect(assessRisk('sharpe', 0.99).tone).toBe('neutral')
    expect(assessRisk('sharpe', -0.01).tone).toBe('bad')
  })

  it('sortino: raised bar vs sharpe since only downside deviation is penalized', () => {
    expect(assessRisk('sortino', 1.5).tone).toBe('good')
    expect(assessRisk('sortino', 1.0).tone).toBe('neutral')
    expect(assessRisk('sortino', -0.1).tone).toBe('bad')
  })

  it('volatility: always non-negative, higher is worse', () => {
    expect(assessRisk('volatility', 0.2).tone).toBe('good')
    expect(assessRisk('volatility', 0.3).tone).toBe('neutral')
    expect(assessRisk('volatility', 0.36).tone).toBe('bad')
  })

  it('var: -2% is good, -4% is neutral (boundary), worse than -4% is bad', () => {
    expect(assessRisk('var', -0.02).tone).toBe('good')
    expect(assessRisk('var', -0.04).tone).toBe('neutral')
    expect(assessRisk('var', -0.041).tone).toBe('bad')
  })

  it('maxdd: -30% boundary is neutral, not bad (strict less-than)', () => {
    expect(assessRisk('maxdd', -0.15).tone).toBe('good')
    expect(assessRisk('maxdd', -0.3).tone).toBe('neutral')
    expect(assessRisk('maxdd', -0.301).tone).toBe('bad')
  })

  it('beta: distance-from-1 bands treat negative beta as "far from typical", not "bad performance"', () => {
    expect(assessRisk('beta', 1.0).tone).toBe('good')
    expect(assessRisk('beta', 1.29).tone).toBe('good') // within 0.3 of 1.0
    expect(assessRisk('beta', 1.5).tone).toBe('neutral')
    expect(assessRisk('beta', -0.5).tone).toBe('bad') // distance 1.5
  })

  it('returns neutral defensively for non-finite input rather than throwing', () => {
    expect(assessRisk('sharpe', NaN).tone).toBe('neutral')
    expect(assessRisk('beta', Infinity).tone).toBe('neutral')
  })

  it('explanationKey is metric+tone scoped for i18n lookup', () => {
    expect(assessRisk('var', -0.05).explanationKey).toBe('riskFace.var.bad')
  })
})
