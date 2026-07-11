import { useTranslation } from 'react-i18next'
import { FORMAT } from '@renderer/components/stats/RiskStatTile'
import type { RiskMetricId } from '@renderer/lib/riskAssessment'
import type { PortfolioRiskStats } from '@renderer/types/market'

interface Props {
  yourStats: PortfolioRiskStats | null
  benchmarkStats: PortfolioRiskStats | null
}

const METRICS: Array<{ id: RiskMetricId; statKey: keyof PortfolioRiskStats; labelKey: string }> = [
  { id: 'sharpe', statKey: 'sharpe', labelKey: 'dock.risk.sharpe' },
  { id: 'sortino', statKey: 'sortino', labelKey: 'dock.risk.sortino' },
  { id: 'volatility', statKey: 'volatilityAnnualized', labelKey: 'dock.risk.volatility' },
  { id: 'var', statKey: 'valueAtRisk95', labelKey: 'dock.risk.var' },
  { id: 'maxdd', statKey: 'maxDrawdown', labelKey: 'dock.risk.maxDrawdown' },
  { id: 'beta', statKey: 'beta', labelKey: 'dock.risk.beta' }
]

/** Side-by-side table of the standard 6 risk stats: your portfolio vs. the selected model
 *  portfolio benchmark. Reuses RiskStatTile's FORMAT map so the numbers read identically to
 *  the main risk-stat grid above. Renders a loading placeholder per row while either side
 *  is still null, rather than throwing on a missing value. */
export default function BenchmarkCompareStats({ yourStats, benchmarkStats }: Props): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="benchmark-compare-stats">
      <div className="benchmark-compare-stats-row benchmark-compare-stats-head">
        <span className="benchmark-compare-stats-label" />
        <span>{t('portfolio.dashboard.benchmarkChartYourPortfolio')}</span>
        <span>{t('portfolio.dashboard.benchmarkChartCompareTo')}</span>
      </div>
      {METRICS.map((m) => (
        <div className="benchmark-compare-stats-row" key={m.id}>
          <span className="benchmark-compare-stats-label">{t(m.labelKey)}</span>
          <span className="tnum">
            {yourStats ? FORMAT[m.id](yourStats[m.statKey]) : t('portfolio.dashboard.benchmarkLoading')}
          </span>
          <span className="tnum">
            {benchmarkStats ? FORMAT[m.id](benchmarkStats[m.statKey]) : t('portfolio.dashboard.benchmarkLoading')}
          </span>
        </div>
      ))}
    </div>
  )
}
