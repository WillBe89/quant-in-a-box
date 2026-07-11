import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { rankHoldingsWithOther } from '@renderer/lib/portfolioBreakdown'
import type { ResolvedHoldingRow } from '@renderer/lib/portfolioHoldings'

export default function HoldingsRankBar({
  rows,
  topN = 8
}: {
  rows: ResolvedHoldingRow[]
  topN?: number
}): JSX.Element {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (rows.length === 0) {
    return <div className="portfolio-empty">{t('portfolio.dashboard.emptyState')}</div>
  }

  const effectiveTopN = expanded ? rows.length : topN
  const ranked = rankHoldingsWithOther(rows, effectiveTopN)
  const foldedCount = rows.length - topN
  const canExpand = rows.length > topN

  const maxPct = ranked.reduce((max, r) => Math.max(max, r.pct), 0) || 1

  return (
    <div className="holdings-rank">
      <div className="holdings-rank-list">
        {ranked.map((entry, i) => (
          <div className="holdings-rank-row" key={entry.isOther ? 'other' : entry.symbol ?? i}>
            <span className="holdings-rank-sym">
              {entry.isOther ? t('portfolio.dashboard.otherLabel', { count: foldedCount }) : entry.symbol}
            </span>
            <span className="holdings-rank-bar-track">
              <span
                className="holdings-rank-bar-fill"
                style={{ width: `${(entry.pct / maxPct) * 100}%` }}
              />
            </span>
            <span className="holdings-rank-pct tnum">{entry.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      {canExpand && (
        <button className="holdings-rank-toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded
            ? t('portfolio.dashboard.showTopBtn', { n: topN })
            : t('portfolio.dashboard.showAllBtn', { count: rows.length })}
        </button>
      )}
    </div>
  )
}
