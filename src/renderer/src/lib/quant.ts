import type { Candle } from '@renderer/types/market'

/** Simple moving average. Returns null for indices before the window fills. */
export function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= period) sum -= values[i - period]
    out.push(i >= period - 1 ? sum / period : null)
  }
  return out
}

/** Exponential moving average, seeded with the first value. */
export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const out: number[] = []
  let prev = values[0]
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[i] : values[i] * k + prev * (1 - k)
    out.push(prev)
  }
  return out
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / (values.length || 1)
}

/** Population standard deviation. */
export function stddev(values: number[]): number {
  const m = mean(values)
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)))
}

/** Day-over-day simple returns from a close-price series. */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) {
    out.push((closes[i] - closes[i - 1]) / closes[i - 1])
  }
  return out
}

/** Annualized volatility (stddev of daily returns scaled by sqrt of trading days). */
export function volatilityAnnualized(returns: number[], periodsPerYear = 252): number {
  return stddev(returns) * Math.sqrt(periodsPerYear)
}

/** Annualized Sharpe ratio: excess return per unit of total volatility. */
export function sharpeRatio(returns: number[], riskFreeRateAnnual = 0, periodsPerYear = 252): number {
  const meanReturnAnnual = mean(returns) * periodsPerYear
  const vol = volatilityAnnualized(returns, periodsPerYear)
  return vol === 0 ? 0 : (meanReturnAnnual - riskFreeRateAnnual) / vol
}

/** Annualized Sortino ratio: excess return per unit of *downside* volatility only. */
export function sortinoRatio(returns: number[], riskFreeRateAnnual = 0, periodsPerYear = 252): number {
  const meanReturnAnnual = mean(returns) * periodsPerYear
  const downside = returns.filter((r) => r < 0)
  const downsideDev = stddev(downside) * Math.sqrt(periodsPerYear)
  return downsideDev === 0 ? 0 : (meanReturnAnnual - riskFreeRateAnnual) / downsideDev
}

/** Largest peak-to-trough decline over the series, expressed as a negative fraction. */
export function maxDrawdown(closes: number[]): number {
  let peak = closes[0] ?? 0
  let worst = 0
  for (const c of closes) {
    if (c > peak) peak = c
    const dd = (c - peak) / peak
    if (dd < worst) worst = dd
  }
  return worst
}

/** Historical (empirical) Value at Risk: the loss threshold not expected to be exceeded
 *  `confidence` fraction of the time, based on the observed return distribution. */
export function historicalVaR(returns: number[], confidence = 0.95): number {
  if (returns.length === 0) return 0
  const sorted = [...returns].sort((a, b) => a - b)
  const idx = Math.floor((1 - confidence) * sorted.length)
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]
}

/** Beta of an asset's returns relative to a market/benchmark return series. */
export function beta(assetReturns: number[], marketReturns: number[]): number {
  const n = Math.min(assetReturns.length, marketReturns.length)
  const a = assetReturns.slice(-n)
  const m = marketReturns.slice(-n)
  const am = mean(a)
  const mm = mean(m)
  let cov = 0
  let varM = 0
  for (let i = 0; i < n; i++) {
    cov += (a[i] - am) * (m[i] - mm)
    varM += (m[i] - mm) ** 2
  }
  return varM === 0 ? 0 : cov / varM
}

export interface BollingerBands {
  mid: Array<number | null>
  upper: Array<number | null>
  lower: Array<number | null>
}

/** Bollinger Bands: an SMA midline with bands at +/- `mult` standard deviations. */
export function bollingerBands(closes: number[], period = 20, mult = 2): BollingerBands {
  const mid = sma(closes, period)
  const upper: Array<number | null> = []
  const lower: Array<number | null> = []
  for (let i = 0; i < closes.length; i++) {
    if (mid[i] == null) {
      upper.push(null)
      lower.push(null)
      continue
    }
    const window = closes.slice(Math.max(0, i - period + 1), i + 1)
    const sd = stddev(window)
    upper.push((mid[i] as number) + sd * mult)
    lower.push((mid[i] as number) - sd * mult)
  }
  return { mid, upper, lower }
}

/** Wilder's RSI (Relative Strength Index), 0-100. */
export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = []
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      out.push(50)
      continue
    }
    const diff = closes[i] - closes[i - 1]
    const gain = Math.max(diff, 0)
    const loss = Math.max(-diff, 0)
    if (i <= period) {
      avgGain = (avgGain * (i - 1) + gain) / i
      avgLoss = (avgLoss * (i - 1) + loss) / i
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + rs))
  }
  return out
}

export interface MacdResult {
  macdLine: number[]
  signalLine: number[]
  histogram: number[]
}

/** MACD: the gap between a fast and slow EMA, plus a signal EMA of that gap. */
export function macd(closes: number[], fast = 12, slow = 26, signal = 9): MacdResult {
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = emaFast.map((v, i) => v - emaSlow[i])
  const signalLine = ema(macdLine, signal)
  const histogram = macdLine.map((v, i) => v - signalLine[i])
  return { macdLine, signalLine, histogram }
}

/** Standard normal CDF via the Abramowitz-Stegun approximation. */
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  let prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  if (x > 0) prob = 1 - prob
  return prob
}

function normPdf(x: number): number {
  return Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI)
}

export interface Greeks {
  price: number
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

/**
 * Black-Scholes price and Greeks for a European option.
 * S = spot, K = strike, T = time to expiry in years, r = risk-free rate, sigma = implied vol.
 */
export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'call' | 'put'
): Greeks {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0)
    return { price: intrinsic, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 }
  }
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / (sigma * Math.sqrt(T))
  const d2 = d1 - sigma * Math.sqrt(T)
  const Nd1 = normCdf(d1)
  const Nd2 = normCdf(d2)
  const nD1 = normPdf(d1)

  if (type === 'call') {
    const price = S * Nd1 - K * Math.exp(-r * T) * Nd2
    return {
      price,
      delta: Nd1,
      gamma: nD1 / (S * sigma * Math.sqrt(T)),
      theta:
        (-((S * nD1 * sigma) / (2 * Math.sqrt(T))) - r * K * Math.exp(-r * T) * Nd2) / 365,
      vega: (S * nD1 * Math.sqrt(T)) / 100,
      rho: (K * T * Math.exp(-r * T) * Nd2) / 100
    }
  }
  const NnegD1 = normCdf(-d1)
  const NnegD2 = normCdf(-d2)
  const price = K * Math.exp(-r * T) * NnegD2 - S * NnegD1
  return {
    price,
    delta: Nd1 - 1,
    gamma: nD1 / (S * sigma * Math.sqrt(T)),
    theta:
      (-((S * nD1 * sigma) / (2 * Math.sqrt(T))) + r * K * Math.exp(-r * T) * NnegD2) / 365,
    vega: (S * nD1 * Math.sqrt(T)) / 100,
    rho: (-K * T * Math.exp(-r * T) * NnegD2) / 100
  }
}

export function closesOf(candles: Candle[]): number[] {
  return candles.map((c) => c.close)
}
