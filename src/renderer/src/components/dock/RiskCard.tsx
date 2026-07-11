import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { dataService } from '@renderer/data/dataService'
import { generateCandles, SPX_PROXY_ASSET } from '@renderer/data/mockData'
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
import RiskStatTile from '@renderer/components/stats/RiskStatTile'
import CardHead from './CardHead'
import type { DockCardProps } from './dockCardProps'
import type { Asset, PortfolioRiskStats } from '@renderer/types/market'

export function useRiskStats(symbol: Asset): PortfolioRiskStats | null {
  const [stats, setStats] = useState<PortfolioRiskStats | null>(null)

  useEffect(() => {
    let cancelled = false
    dataService.getCandles(symbol, '1Y').then((candles) => {
      if (cancelled || candles.length < 5) return
      const closes = closesOf(candles)
      const returns = dailyReturns(closes)
      const benchmarkReturns = dailyReturns(closesOf(generateCandles(SPX_PROXY_ASSET, '1Y')))
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

  return stats
}

export function RiskCardBody({ stats }: { stats: PortfolioRiskStats | null }): JSX.Element {
  const { t } = useTranslation()
  if (!stats) return <div className="stat-loading">{t('dock.risk.loading')}</div>
  return (
    <div className="stat-grid">
      <RiskStatTile metric="sharpe" label={t('dock.risk.sharpe')} lessonId="sharpe" rawValue={stats.sharpe} />
      <RiskStatTile metric="sortino" label={t('dock.risk.sortino')} lessonId="sortino" rawValue={stats.sortino} />
      <RiskStatTile
        metric="volatility"
        label={t('dock.risk.volatility')}
        lessonId="volatility"
        rawValue={stats.volatilityAnnualized}
      />
      <RiskStatTile metric="var" label={t('dock.risk.var')} lessonId="var" rawValue={stats.valueAtRisk95} />
      <RiskStatTile
        metric="maxdd"
        label={t('dock.risk.maxDrawdown')}
        lessonId="maxdd"
        rawValue={stats.maxDrawdown}
      />
      <RiskStatTile metric="beta" label={t('dock.risk.beta')} lessonId="beta" rawValue={stats.beta} />
    </div>
  )
}

export default function RiskCard(props: DockCardProps): JSX.Element {
  const { t } = useTranslation()
  const { symbol } = useAppState()
  const stats = useRiskStats(symbol)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <section className={'card' + (collapsed ? ' collapsed' : '')} data-card="risk">
      <CardHead
        title={t('dock.risk.title')}
        lessonId="sharpe"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        {...props}
      />
      <div className="card-body">
        <RiskCardBody stats={stats} />
      </div>
    </section>
  )
}
