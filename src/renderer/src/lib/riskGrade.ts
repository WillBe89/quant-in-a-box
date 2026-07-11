import { assessRisk, type RiskTone } from '@renderer/lib/riskAssessment'
import type { ClassBreakdownSlice } from '@renderer/lib/portfolioBreakdown'
import type { PortfolioRiskStats } from '@renderer/types/market'

export type RiskGradeCategory = 'conservative' | 'moderate' | 'elevated' | 'high'

export interface RiskGradeSignals {
  volatility: RiskTone
  maxdd: RiskTone
  diversification: RiskTone
  var: RiskTone
  beta: RiskTone
}

export interface RiskGrade {
  score: number
  category: RiskGradeCategory
  signals: RiskGradeSignals
}

/** Sharpe and Sortino deliberately excluded — they measure risk-adjusted return quality,
 *  not risk magnitude, so including them would let a turbulent-but-lucky portfolio read
 *  as "safe". Diversification gets the same weight as volatility/max-drawdown since
 *  concentration is just as real a source of risk as historical price swings; VaR and
 *  beta are lighter-weight corroborating signals. */
const WEIGHTS: Record<keyof RiskGradeSignals, number> = {
  volatility: 2.5,
  maxdd: 2.5,
  diversification: 2.5,
  var: 1.5,
  beta: 1.0
}

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0)

/** bad=2, neutral=1, good=0 — higher points always mean more risk. */
const POINTS: Record<RiskTone, number> = { good: 0, neutral: 1, bad: 2 }

/** Not one of riskAssessment.ts's RiskMetricId bands, so computed locally: bad if there's
 *  effectively one asset class (or one dominates at 80%+ of value), good only once holdings
 *  are spread across 3+ classes with no single class over 60%. */
function assessDiversification(classBreakdown: ClassBreakdownSlice[]): RiskTone {
  if (classBreakdown.length === 0) return 'neutral'
  const largestPct = Math.max(...classBreakdown.map((s) => s.pct))
  if (classBreakdown.length <= 1 || largestPct >= 80) return 'bad'
  if (classBreakdown.length >= 3 && largestPct <= 60) return 'good'
  return 'neutral'
}

function categoryForScore(score: number): RiskGradeCategory {
  if (score <= 24) return 'conservative'
  if (score <= 49) return 'moderate'
  if (score <= 74) return 'elevated'
  return 'high'
}

/** Weighted 0-100 risk grade from the portfolio's risk stats and asset-class mix. Pure
 *  business logic only — no i18n/t() calls and no hardcoded English strings live here;
 *  all display copy is composed by the component from these tones/score/category. */
export function computeRiskGrade(stats: PortfolioRiskStats, classBreakdown: ClassBreakdownSlice[]): RiskGrade {
  if (classBreakdown.length === 0) {
    return {
      score: 0,
      category: 'conservative',
      signals: {
        volatility: 'neutral',
        maxdd: 'neutral',
        diversification: 'neutral',
        var: 'neutral',
        beta: 'neutral'
      }
    }
  }

  const signals: RiskGradeSignals = {
    volatility: assessRisk('volatility', stats.volatilityAnnualized).tone,
    maxdd: assessRisk('maxdd', stats.maxDrawdown).tone,
    diversification: assessDiversification(classBreakdown),
    var: assessRisk('var', stats.valueAtRisk95).tone,
    beta: assessRisk('beta', stats.beta).tone
  }

  const weightedSum = (Object.keys(WEIGHTS) as Array<keyof RiskGradeSignals>).reduce(
    (sum, key) => sum + WEIGHTS[key] * POINTS[signals[key]],
    0
  )

  let score = Math.round((weightedSum / (2 * TOTAL_WEIGHT)) * 100)

  // A brand-new single-asset-class portfolio may have too little price history to look
  // volatile yet, but a total lack of diversification is itself the risk worth flagging.
  if (classBreakdown.length === 1) {
    score = Math.max(score, 60)
  }

  return { score, category: categoryForScore(score), signals }
}
