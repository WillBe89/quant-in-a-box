/** Blends each holding's own daily-return series into one portfolio-level return series,
 *  weighted by each holding's share of total market value.
 *  Assumes the return series are already aligned bar-for-bar (true for the mock generator's
 *  fixed bar counts; real market data would need date alignment first). */
export function weightedPortfolioReturns(holdings: Array<{ weight: number; returns: number[] }>): number[] {
  if (holdings.length === 0) return []
  const length = Math.min(...holdings.map((h) => h.returns.length))
  const out: number[] = []
  for (let t = 0; t < length; t++) {
    let sum = 0
    for (const h of holdings) sum += h.weight * h.returns[t]
    out.push(sum)
  }
  return out
}

/** Turns a return series into a cumulative value series starting at `base`, so
 *  price-level quant functions (e.g. maxDrawdown) can run on portfolio-wide performance. */
export function cumulativeValueSeries(returns: number[], base = 1): number[] {
  const out: number[] = [base]
  let value = base
  for (const r of returns) {
    value = value * (1 + r)
    out.push(value)
  }
  return out
}
