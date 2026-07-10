import { useEffect, useState } from 'react'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import { generateCandles } from '@renderer/data/mockData'
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
import InfoIcon from '@renderer/academy/InfoIcon'
import CardHead from './CardHead'
import type { PortfolioRiskStats } from '@renderer/types/market'

const BENCHMARK = { symbol: 'SPXPROXY', name: 'Broad market proxy', klass: 'stocks' as const, price: 5500, changePct: 0.5 }

export default function RiskCard(): JSX.Element {
  const { symbol } = useAppState()
  const [stats, setStats] = useState<PortfolioRiskStats | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataService.getCandles(symbol, '1Y').then((candles) => {
      if (cancelled || candles.length < 5) return
      const closes = closesOf(candles)
      const returns = dailyReturns(closes)
      const benchmarkReturns = dailyReturns(closesOf(generateCandles(BENCHMARK, '1Y')))
      setStats({
        sharpe: sharpeRatio(returns),
        sortino: sortinoRatio(returns),
        volatilityAnnualized: volatilityAnnualized(returns),
        valueAtRisk95: historicalVaR(returns, 0.95),
        maxDrawdown: maxDrawdown(closes),
        beta: betaCalc(returns, benchmarkReturns)
      })
    })
    return () => {
      cancelled = true
    }
  }, [symbol])

  return (
    <section className={'card' + (collapsed ? ' collapsed' : '')} data-card="risk">
      <CardHead title="Portfolio risk" lessonId="sharpe" collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="card-body">
        {!stats ? (
          <div className="stat-loading">Crunching return history…</div>
        ) : (
          <div className="stat-grid">
            <StatTile tone="ok" label="Sharpe ratio" lessonId="sharpe" value={stats.sharpe.toFixed(2)} />
            <StatTile tone="ok" label="Sortino" lessonId="sortino" value={stats.sortino.toFixed(2)} />
            <StatTile
              tone="neutral"
              label="Volatility (ann.)"
              lessonId="volatility"
              value={`${(stats.volatilityAnnualized * 100).toFixed(1)}%`}
            />
            <StatTile
              tone="warn"
              label="VaR (95%, 1d)"
              lessonId="var"
              value={`${(stats.valueAtRisk95 * 100).toFixed(1)}%`}
            />
            <StatTile
              tone="warn"
              label="Max drawdown"
              lessonId="maxdd"
              value={`${(stats.maxDrawdown * 100).toFixed(1)}%`}
            />
            <StatTile tone="neutral" label="Beta (vs market)" lessonId="beta" value={stats.beta.toFixed(2)} />
          </div>
        )}
      </div>
    </section>
  )
}


function StatTile({
  tone,
  label,
  lessonId,
  value
}: {
  tone: 'ok' | 'warn' | 'neutral'
  label: string
  lessonId: string
  value: string
}): JSX.Element {
  return (
    <div className={`stat-tile ${tone}`}>
      <div className="stripe" />
      <div className="lbl">
        {label} <InfoIcon lessonId={lessonId} />
      </div>
      <div className="val tnum">{value}</div>
    </div>
  )
}
