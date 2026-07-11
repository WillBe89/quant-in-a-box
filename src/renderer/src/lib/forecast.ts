import { mean, stddev } from '@renderer/lib/quant'

/** A forward-looking projection: one central path plus an upper/lower band, indexed by
 *  bars-ahead (index 0 = 1 bar ahead, index 1 = 2 bars ahead, ...). All math here works in
 *  bar-index units, not calendar time — callers convert "k bars ahead" into real timestamps
 *  themselves, since bar spacing varies wildly by timeframe. */
export interface ForecastBand {
  central: number[]
  upper: number[]
  lower: number[]
}

/** Per-bar log-returns: ln(closes[i] / closes[i-1]) for i = 1..closes.length-1. */
function logReturns(closes: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) {
    out.push(Math.log(closes[i] / closes[i - 1]))
  }
  return out
}

/** Flat band at the last-known close, for degenerate inputs that can't support any real fit. */
function flatBand(closes: number[], horizonBars: number): ForecastBand {
  const last = closes.length > 0 ? closes[closes.length - 1] : 0
  return {
    central: Array(horizonBars).fill(last),
    upper: Array(horizonBars).fill(last),
    lower: Array(horizonBars).fill(last)
  }
}

/**
 * Box-Muller transform: turns two uniform(0,1) draws into one standard-normal draw.
 * Guards against rng() returning exactly 0 (clamped to Number.EPSILON), since ln(0) = -Infinity
 * would otherwise poison every subsequent draw.
 */
export function randomNormal(rng: () => number = Math.random): number {
  const u1 = Math.max(rng(), Number.EPSILON)
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

/**
 * Method 1: closed-form geometric Brownian motion drift, extrapolated from the mean/stdev of
 * historical log-returns. `z` is a hardcoded standard-normal quantile (1.645 ~= a 90% two-sided
 * band) since quant.ts only exposes normCdf/normPdf (for Black-Scholes), not an inverse-CDF
 * helper to derive z from an arbitrary confidence level.
 */
export function driftForecast(closes: number[], horizonBars: number, z = 1.645): ForecastBand {
  if (closes.length < 2 || horizonBars <= 0) return flatBand(closes, Math.max(0, horizonBars))
  const returns = logReturns(closes)
  const mu = mean(returns)
  const sigma = stddev(returns)
  const S0 = closes[closes.length - 1]
  const central: number[] = []
  const upper: number[] = []
  const lower: number[] = []
  for (let t = 1; t <= horizonBars; t++) {
    const drift = (mu - (sigma * sigma) / 2) * t
    const width = z * sigma * Math.sqrt(t)
    central.push(S0 * Math.exp(drift))
    upper.push(S0 * Math.exp(drift + width))
    lower.push(S0 * Math.exp(drift - width))
  }
  return { central, upper, lower }
}

/**
 * Method 2: OLS linear regression of bar-index vs. raw close, extrapolated forward. Mirrors the
 * covariance/variance loop already in quant.ts's beta() (index plays the role of "market returns").
 * Band width is the fit's residual standard deviation, held constant across the horizon (a simple
 * choice — the regression's own uncertainty about slope/intercept isn't modeled).
 */
export function regressionForecast(closes: number[], horizonBars: number, z = 1.645): ForecastBand {
  if (closes.length < 2 || horizonBars <= 0) return flatBand(closes, Math.max(0, horizonBars))
  const n = closes.length
  const idx = Array.from({ length: n }, (_, i) => i)
  const idxMean = mean(idx)
  const closeMean = mean(closes)
  let cov = 0
  let varIdx = 0
  for (let i = 0; i < n; i++) {
    cov += (idx[i] - idxMean) * (closes[i] - closeMean)
    varIdx += (idx[i] - idxMean) ** 2
  }
  const slope = varIdx === 0 ? 0 : cov / varIdx
  const intercept = closeMean - slope * idxMean
  const residuals = closes.map((c, i) => c - (intercept + slope * idx[i]))
  const residualSd = stddev(residuals)
  const central: number[] = []
  const upper: number[] = []
  const lower: number[] = []
  for (let t = 1; t <= horizonBars; t++) {
    const fitted = intercept + slope * (n - 1 + t)
    const width = z * residualSd
    central.push(fitted)
    upper.push(fitted + width)
    lower.push(fitted - width)
  }
  return { central, upper, lower }
}

/**
 * Method 3: ~`paths` simulated GBM paths using the same per-bar mean/stdev of log-returns as
 * driftForecast, percentile-banded (5th/50th/95th) at each future bar. Accepts an injectable rng
 * for deterministic testing.
 */
export function monteCarloForecast(
  closes: number[],
  horizonBars: number,
  paths = 500,
  rng: () => number = Math.random
): ForecastBand {
  if (closes.length < 2 || horizonBars <= 0) return flatBand(closes, Math.max(0, horizonBars))
  const returns = logReturns(closes)
  const mu = mean(returns)
  const sigma = stddev(returns)
  const S0 = closes[closes.length - 1]

  // simulated[t][p] = simulated price at bar t (0-indexed) for path p
  const simulated: number[][] = Array.from({ length: horizonBars }, () => new Array(paths).fill(0))
  for (let p = 0; p < paths; p++) {
    let price = S0
    for (let t = 0; t < horizonBars; t++) {
      const z = randomNormal(rng)
      price = price * Math.exp(mu - (sigma * sigma) / 2 + sigma * z)
      simulated[t][p] = price
    }
  }

  function percentile(sortedValues: number[], p: number): number {
    const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.round(p * (sortedValues.length - 1))))
    return sortedValues[idx]
  }

  const central: number[] = []
  const upper: number[] = []
  const lower: number[] = []
  for (let t = 0; t < horizonBars; t++) {
    const sorted = [...simulated[t]].sort((a, b) => a - b)
    lower.push(percentile(sorted, 0.05))
    central.push(percentile(sorted, 0.5))
    upper.push(percentile(sorted, 0.95))
  }
  return { central, upper, lower }
}
