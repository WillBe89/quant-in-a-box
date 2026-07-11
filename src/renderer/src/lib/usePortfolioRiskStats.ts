import { useEffect, useState } from 'react'
import { dataService } from '@renderer/data/dataService'
import { SPX_PROXY_ASSET, generateCandles } from '@renderer/data/mockData'
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

export interface RiskAssessment {
  stats: PortfolioRiskStats | null
  loading: boolean
}

/** Fetches ~1Y of candles for each weighted holding (plus the shared benchmark, for beta),
 *  blends them into a portfolio-level return series, and computes the standard 6-stat
 *  risk summary. Guards against a stale fetch from a previous holdings composition
 *  overwriting state after `positions` has since changed. */
export function usePortfolioRiskStats(
  positions: Array<{ symbol: string; quantity: number; costBasis: number }>
): RiskAssessment {
  const [stats, setStats] = useState<PortfolioRiskStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const rows = resolveHoldingRows(positions)
    if (rows.length === 0) {
      setStats(null)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all(
      rows.map(async (r) => {
        const candles = await dataService.getCandles(r.asset, '1Y')
        return { weight: r.weightPct / 100, returns: dailyReturns(closesOf(candles)) }
      })
    ).then((holdings) => {
      if (cancelled) return
      const portReturns = weightedPortfolioReturns(holdings)
      if (portReturns.length < 5) {
        setStats(null)
        setLoading(false)
        return
      }
      const valueSeries = cumulativeValueSeries(portReturns)
      const benchmarkReturns = dailyReturns(closesOf(generateCandles(SPX_PROXY_ASSET, '1Y')))
      setStats({
        sharpe: sharpeRatio(portReturns),
        sortino: sortinoRatio(portReturns),
        volatilityAnnualized: volatilityAnnualized(portReturns),
        valueAtRisk95: historicalVaR(portReturns, 0.95),
        maxDrawdown: maxDrawdown(valueSeries),
        beta: betaCalc(portReturns, benchmarkReturns)
      })
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions])

  return { stats, loading }
}
