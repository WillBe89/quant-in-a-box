export type RiskMetricId = 'sharpe' | 'sortino' | 'volatility' | 'var' | 'maxdd' | 'beta'
export type RiskTone = 'good' | 'neutral' | 'bad'

export interface RiskAssessment {
  tone: RiskTone
  /** i18n key for the short explanation, e.g. "riskFace.sharpe.good" */
  explanationKey: string
}

interface Band {
  good: (v: number) => boolean
  bad: (v: number) => boolean
}

/**
 * Thresholds are expressed in each metric's native signed scale exactly as
 * lib/quant.ts returns it (VaR and Max Drawdown are negative fractions, not
 * positive magnitudes). Sharpe's bar matches the Academy lesson's own copy
 * ("above 1 decent, above 2 very good") so this never contradicts the
 * teaching content. Beta is bands of distance from 1.0 ("typical vs extreme"),
 * not a performance judgment — see riskFace.beta.caveat.
 */
const BANDS: Record<RiskMetricId, Band> = {
  sharpe: { good: (v) => v >= 1, bad: (v) => v < 0 },
  sortino: { good: (v) => v >= 1.5, bad: (v) => v < 0 },
  volatility: { good: (v) => v <= 0.2, bad: (v) => v > 0.35 },
  var: { good: (v) => v >= -0.02, bad: (v) => v < -0.04 },
  maxdd: { good: (v) => v >= -0.15, bad: (v) => v < -0.3 },
  beta: { good: (v) => Math.abs(v - 1) <= 0.3, bad: (v) => Math.abs(v - 1) > 0.7 }
}

export function assessRisk(metric: RiskMetricId, value: number): RiskAssessment {
  if (!Number.isFinite(value)) return { tone: 'neutral', explanationKey: `riskFace.${metric}.neutral` }
  const band = BANDS[metric]
  const tone: RiskTone = band.good(value) ? 'good' : band.bad(value) ? 'bad' : 'neutral'
  return { tone, explanationKey: `riskFace.${metric}.${tone}` }
}
