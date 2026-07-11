import { useEffect, useMemo, useState } from 'react'
import { dataService } from '@renderer/data/dataService'
import { ALL_ASSETS, SPX_PROXY_ASSET, generateCandles } from '@renderer/data/mockData'
import {
  beta as betaCalc,
  closesOf,
  dailyReturns,
  historicalVaR,
  maxDrawdown,
  sharpeRatio,
  sortinoRatio,
  volatilityAnnualized
} from '@renderer/lib/quant'
import { cumulativeValueSeries, weightedPortfolioReturns } from '@renderer/lib/portfolioMath'
import { resolveHoldingRows } from '@renderer/lib/portfolioHoldings'
import type { PortfolioRiskStats } from '@renderer/types/market'

/** A holding expressed as a symbol + fractional weight (weights across a set should sum to ~1),
 *  with no need for quantity/cost-basis/price — the minimum a risk calc needs to fetch candles
 *  and blend a return series. */
export interface WeightedHolding {
  symbol: string
  weight: number
}

export interface RiskAssessment {
  stats: PortfolioRiskStats | null
  /** Cumulative value series (base = 1) for the blended holdings, suitable for a compare chart.
   *  Null until computed/loaded, same lifecycle as `stats`. */
  valueSeries: number[] | null
  loading: boolean
}

/** Fetches ~1Y of candles for each weighted holding (plus the shared benchmark, for beta),
 *  blends them into a portfolio-level return series, and computes the standard 6-stat
 *  risk summary. Guards against a stale fetch from a previous holdings composition
 *  overwriting state after `weighted` has since changed. */
export function useWeightedRiskStats(weighted: WeightedHolding[]): RiskAssessment {
  const [stats, setStats] = useState<PortfolioRiskStats | null>(null)
  const [valueSeries, setValueSeries] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (weighted.length === 0) {
      setStats(null)
      setValueSeries(null)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all(
      weighted.map(async (w) => {
        const asset = ALL_ASSETS.find((a) => a.symbol === w.symbol)
        if (!asset) return null
        const candles = await dataService.getCandles(asset, '1Y')
        return { weight: w.weight, returns: dailyReturns(closesOf(candles)) }
      })
    ).then((resolved) => {
      if (cancelled) return
      const holdings = resolved.filter((h): h is { weight: number; returns: number[] } => h !== null)
      const portReturns = weightedPortfolioReturns(holdings)
      if (portReturns.length < 5) {
        setStats(null)
        setValueSeries(null)
        setLoading(false)
        return
      }
      const series = cumulativeValueSeries(portReturns)
      const benchmarkReturns = dailyReturns(closesOf(generateCandles(SPX_PROXY_ASSET, '1Y')))
      setStats({
        sharpe: sharpeRatio(portReturns),
        sortino: sortinoRatio(portReturns),
        volatilityAnnualized: volatilityAnnualized(portReturns),
        valueAtRisk95: historicalVaR(portReturns, 0.95),
        maxDrawdown: maxDrawdown(series),
        beta: betaCalc(portReturns, benchmarkReturns)
      })
      setValueSeries(series)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weighted])

  return { stats, valueSeries, loading }
}

/** Thin wrapper over useWeightedRiskStats for real portfolio positions: resolves each
 *  position to its current holding row (for weightPct) and hands symbol+weight pairs off
 *  to the shared engine. `weighted` is memoized on `positions` so an unrelated re-render
 *  of the caller doesn't create a new array reference and re-trigger the fetch effect. */
export function usePortfolioRiskStats(
  positions: Array<{ symbol: string; quantity: number; costBasis: number }>
): RiskAssessment {
  const weighted = useMemo<WeightedHolding[]>(() => {
    const rows = resolveHoldingRows(positions)
    return rows.map((r) => ({ symbol: r.asset.symbol, weight: r.weightPct / 100 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions])

  return useWeightedRiskStats(weighted)
}
