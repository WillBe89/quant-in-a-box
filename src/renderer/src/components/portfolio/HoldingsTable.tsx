import { useTranslation } from 'react-i18next'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import type { ResolvedHoldingRow } from '@renderer/lib/portfolioHoldings'

/** Shared holdings table for both a single PortfolioPane and the aggregate Overview panel.
 *  When `onRemove` is provided a remove-position button column is rendered (as PortfolioPane
 *  needs); when omitted the column is left out entirely — the read-only mode the Overview
 *  panel needs, since removing a position that's blended across multiple source portfolios
 *  is ambiguous. */
export default function HoldingsTable({
  rows,
  onRemove
}: {
  rows: ResolvedHoldingRow[]
  onRemove?: (symbol: string) => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="portfolio-table-wrap">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>{t('portfolio.colSymbol')}</th>
            <th>{t('portfolio.colQty')}</th>
            <th>{t('portfolio.colAvgCost')}</th>
            <th>{t('portfolio.colPrice')}</th>
            <th>{t('portfolio.colValue')}</th>
            <th>{t('portfolio.colPnl')}</th>
            <th>{t('portfolio.colWeight')}</th>
            {onRemove && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.asset.symbol}>
              <td className="portfolio-sym">{r.asset.symbol}</td>
              <td className="tnum">{r.quantity}</td>
              <td className="tnum">{r.costBasis.toFixed(2)}</td>
              <td className="tnum">{r.currentPrice.toFixed(2)}</td>
              <td className="tnum">{r.marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              <td className={'tnum ' + (r.pnl >= 0 ? 'up' : 'down')}>
                {r.pnl >= 0 ? '+' : ''}
                {r.pnlPct.toFixed(1)}%
              </td>
              <td className="tnum">{r.weightPct.toFixed(1)}%</td>
              {onRemove && (
                <td>
                  <Tooltip label={t('portfolio.removePosition') ?? ''}>
                    <button
                      className="portfolio-remove"
                      onClick={() => onRemove(r.asset.symbol)}
                      aria-label={t('portfolio.removePosition') ?? undefined}
                    >
                      <IconClose size={12} />
                    </button>
                  </Tooltip>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
