import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Tooltip from '@renderer/components/ui/Tooltip'
import { IconDownload } from '@renderer/components/icons/Icons'
import type { ResolvedHoldingRow } from '@renderer/lib/portfolioHoldings'
import type { ClassBreakdownSlice } from '@renderer/lib/portfolioBreakdown'
import type { AssetClass, PortfolioRiskStats } from '@renderer/types/market'

const CLASS_NAME_KEY: Record<AssetClass, string> = {
  stocks: 'topbar.classStocks',
  crypto: 'topbar.classCrypto',
  bonds: 'topbar.classBonds',
  fx: 'topbar.classFx',
  re: 'topbar.classRe'
}

type ExportStatus = 'success' | 'canceled' | 'error' | null

const STATUS_CLEAR_MS = 4000

/** Small reusable header button that exports a portfolio (real or blended) to an Excel report —
 *  used by both PortfolioPane (one portfolio) and PortfolioOverviewPanel (all portfolios merged).
 *  Shows a transient inline status message next to the button rather than a toast, since this
 *  app has no toast/snackbar system today. */
export default function ExportReportButton({
  portfolioName,
  rows,
  stats,
  classBreakdown
}: {
  portfolioName: string
  rows: ResolvedHoldingRow[]
  stats: PortfolioRiskStats
  classBreakdown: ClassBreakdownSlice[]
}): JSX.Element {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ExportStatus>(null)

  function flashStatus(next: Exclude<ExportStatus, null>): void {
    setStatus(next)
    setTimeout(() => setStatus((current) => (current === next ? null : current)), STATUS_CLEAR_MS)
  }

  async function handleExport(): Promise<void> {
    const result = await window.api
      ?.exportPortfolioReport({
        portfolioName,
        rows: rows.map((r) => ({
          symbol: r.asset.symbol,
          name: r.asset.name,
          quantity: r.quantity,
          costBasis: r.costBasis,
          currentPrice: r.currentPrice,
          marketValue: r.marketValue,
          pnl: r.pnl,
          pnlPct: r.pnlPct,
          weightPct: r.weightPct
        })),
        stats,
        classBreakdown: classBreakdown.map((c) => ({
          label: t(CLASS_NAME_KEY[c.klass]),
          marketValue: c.marketValue,
          pct: c.pct
        }))
      })
      .catch(() => null)

    if (!result) {
      flashStatus('error')
    } else if (result.ok) {
      flashStatus('success')
    } else if (result.canceled) {
      flashStatus('canceled')
    } else {
      flashStatus('error')
    }
  }

  return (
    <div className="export-report-btn-wrap">
      <Tooltip label={t('portfolio.export.button') ?? ''}>
        <button className="icon-btn" onClick={() => handleExport()} aria-label={t('portfolio.export.button') ?? undefined}>
          <IconDownload size={14} />
        </button>
      </Tooltip>
      {status && (
        <span className={'export-status' + (status === 'success' ? ' ok' : status === 'error' ? ' err' : '')}>
          {status === 'success'
            ? t('portfolio.export.success')
            : status === 'error'
              ? t('portfolio.export.error')
              : t('portfolio.export.canceled')}
        </span>
      )}
    </div>
  )
}
