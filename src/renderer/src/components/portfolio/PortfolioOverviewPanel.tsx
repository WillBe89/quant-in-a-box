import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import OverlayPanel from '@renderer/components/ui/OverlayPanel'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import { mergePortfolioHoldings, resolveHoldingRows } from '@renderer/lib/portfolioHoldings'
import { usePortfolioRiskStats } from '@renderer/lib/usePortfolioRiskStats'
import HoldingsTable from '@renderer/components/portfolio/HoldingsTable'
import PortfolioDashboardTab from '@renderer/components/portfolio/PortfolioDashboardTab'
import './portfolio.css'

/** Single top-level panel (not one-per-open-portfolio-id, unlike PortfolioWorkspace) showing a
 *  read-only, blended view across every portfolio the user has — same Holdings/Dashboard tab
 *  strip and PortfolioDashboardTab composition PortfolioPane already uses, just fed a merged
 *  position set instead of a single portfolio's positions. */
export default function PortfolioOverviewPanel(): JSX.Element {
  const { t } = useTranslation()
  const { portfolios, overviewOpen, closeOverview } = useAppState()

  const [tab, setTab] = useState<'holdings' | 'dashboard'>('holdings')

  const merged = useMemo(() => mergePortfolioHoldings(portfolios), [portfolios])
  const rows = useMemo(() => resolveHoldingRows(merged), [merged])
  const risk = usePortfolioRiskStats(merged)

  return (
    <OverlayPanel
      open={overviewOpen}
      onClose={closeOverview}
      ariaLabel={t('portfolio.overview.heading')}
      zIndex={106}
      className="portfolio-overview-panel"
    >
      <div className="overlay-header">
        <div className="overlay-title">
          <span className="overlay-badge">{t('portfolio.overview.badge')}</span>
          <h2>{t('portfolio.overview.heading')}</h2>
        </div>
        <Tooltip label={t('common.close') ?? ''}>
          <button className="icon-btn" onClick={closeOverview} aria-label={t('common.close') ?? undefined}>
            <IconClose size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="overlay-body">
        {rows.length === 0 ? (
          <div className="portfolio-empty">{t('portfolio.overview.emptyState')}</div>
        ) : (
          <>
            <div className="segmented portfolio-tab-strip">
              <button className={tab === 'holdings' ? 'active' : ''} onClick={() => setTab('holdings')}>
                {t('portfolio.dashboard.tabHoldings')}
              </button>
              <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
                {t('portfolio.dashboard.tabDashboard')}
              </button>
            </div>

            {tab === 'holdings' ? <HoldingsTable rows={rows} /> : <PortfolioDashboardTab rows={rows} risk={risk} />}
          </>
        )}
      </div>
    </OverlayPanel>
  )
}
