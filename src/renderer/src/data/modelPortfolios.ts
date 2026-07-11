import type { WeightedHolding } from '@renderer/lib/usePortfolioRiskStats'

export type ModelPortfolioId = 'conservative' | 'balanced' | 'growth'

export interface ModelPortfolioPreset {
  id: ModelPortfolioId
  nameKey: string
  descriptionKey: string
  /** Fractional weights (of 1.0) across the preset's holdings. */
  holdings: WeightedHolding[]
}

/** Three off-the-shelf model portfolios used as benchmarks for a user's actual holdings.
 *  Every symbol below is one of the curated, hand-picked assets in data/mockData.ts
 *  (not a procedurally generated ticker), so these read as recognizable, real names. */
export const MODEL_PORTFOLIOS: ModelPortfolioPreset[] = [
  {
    id: 'conservative',
    nameKey: 'modelPortfolio.conservative.name',
    descriptionKey: 'modelPortfolio.conservative.description',
    holdings: [
      // stocks 15% — blue-chip only
      { symbol: 'AAPL', weight: 0.08 },
      { symbol: 'MSFT', weight: 0.07 },
      // bonds 55% — short-duration + investment-grade tilt
      { symbol: 'SHY', weight: 0.2 },
      { symbol: 'IEF', weight: 0.15 },
      { symbol: 'AGG', weight: 0.1 },
      { symbol: 'LQD', weight: 0.1 },
      // crypto 2% — minimal
      { symbol: 'BTC', weight: 0.02 },
      // fx 20% — gold-heavy safe-haven tilt
      { symbol: 'XAUUSD', weight: 0.1 },
      { symbol: 'EURUSD', weight: 0.05 },
      { symbol: 'USDJPY', weight: 0.05 },
      // real estate 8%
      { symbol: 'VNQ', weight: 0.04 },
      { symbol: 'O', weight: 0.04 }
    ]
  },
  {
    id: 'balanced',
    nameKey: 'modelPortfolio.balanced.name',
    descriptionKey: 'modelPortfolio.balanced.description',
    holdings: [
      // stocks 40% — broader equity set
      { symbol: 'NVDA', weight: 0.15 },
      { symbol: 'AAPL', weight: 0.15 },
      { symbol: 'MSFT', weight: 0.1 },
      // bonds 30% — diversified sleeve (aggregate, corp, international, EM)
      { symbol: 'AGG', weight: 0.1 },
      { symbol: 'LQD', weight: 0.1 },
      { symbol: 'BNDX', weight: 0.05 },
      { symbol: 'EMB', weight: 0.05 },
      // crypto 10% — modest
      { symbol: 'BTC', weight: 0.06 },
      { symbol: 'ETH', weight: 0.04 },
      // fx 10% — modest
      { symbol: 'XAUUSD', weight: 0.05 },
      { symbol: 'EURUSD', weight: 0.05 },
      // real estate 10% — modest
      { symbol: 'VNQ', weight: 0.05 },
      { symbol: 'PLD', weight: 0.05 }
    ]
  },
  {
    id: 'growth',
    nameKey: 'modelPortfolio.growth.name',
    descriptionKey: 'modelPortfolio.growth.description',
    holdings: [
      // stocks 45% — growth-tilted
      { symbol: 'NVDA', weight: 0.2 },
      { symbol: 'AAPL', weight: 0.15 },
      { symbol: 'MSFT', weight: 0.1 },
      // bonds 10% — reduced to a single position
      { symbol: 'AGG', weight: 0.1 },
      // crypto 30% — meaningful, including a higher-beta coin
      { symbol: 'BTC', weight: 0.15 },
      { symbol: 'ETH', weight: 0.08 },
      { symbol: 'SOL', weight: 0.07 },
      // fx 5% — modest
      { symbol: 'XAUUSD', weight: 0.05 },
      // real estate 10% — modest
      { symbol: 'VNQ', weight: 0.05 },
      { symbol: 'PLD', weight: 0.05 }
    ]
  }
]
