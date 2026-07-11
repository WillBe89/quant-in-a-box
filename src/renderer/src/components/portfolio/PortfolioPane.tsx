import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppState } from '@renderer/state/AppStateContext'
import { ALL_ASSETS } from '@renderer/data/mockData'
import { resolveHoldingRows } from '@renderer/lib/portfolioHoldings'
import { computeAssetClassBreakdown } from '@renderer/lib/portfolioBreakdown'
import { usePortfolioRiskStats } from '@renderer/lib/usePortfolioRiskStats'
import { searchAssets } from '@renderer/lib/assetSearch'
import { IconClose } from '@renderer/components/icons/Icons'
import Tooltip from '@renderer/components/ui/Tooltip'
import PortfolioDashboardTab from '@renderer/components/portfolio/PortfolioDashboardTab'
import HoldingsTable from '@renderer/components/portfolio/HoldingsTable'
import ExportReportButton from '@renderer/components/portfolio/ExportReportButton'
import type { Asset, PortfolioRiskStats } from '@renderer/types/market'
import './portfolio.css'

const ZERO_RISK_STATS: PortfolioRiskStats = {
  sharpe: 0,
  sortino: 0,
  volatilityAnnualized: 0,
  valueAtRisk95: 0,
  maxDrawdown: 0,
  beta: 0
}

export default function PortfolioPane({
  portfolioId,
  onClose
}: {
  portfolioId: string
  onClose: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const { portfolios, addPosition, removePosition } = useAppState()
  const portfolio = portfolios.find((p) => p.id === portfolioId)

  const [symbolQuery, setSymbolQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<Asset | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const [costBasisInput, setCostBasisInput] = useState('')
  const quantityInputRef = useRef<HTMLInputElement | null>(null)

  const [tab, setTab] = useState<'holdings' | 'dashboard'>('holdings')

  const positions = useMemo(() => portfolio?.positions ?? [], [portfolio])

  const rows = useMemo(() => resolveHoldingRows(positions), [positions])

  const totals = useMemo(() => {
    const marketValue = rows.reduce((s, r) => s + r.marketValue, 0)
    const costTotal = rows.reduce((s, r) => s + r.costTotal, 0)
    const pnl = marketValue - costTotal
    return { marketValue, costTotal, pnl, pnlPct: costTotal === 0 ? 0 : (pnl / costTotal) * 100 }
  }, [rows])

  const risk = usePortfolioRiskStats(positions)

  const classBreakdown = useMemo(() => computeAssetClassBreakdown(rows), [rows])

  const matches = useMemo(() => searchAssets(ALL_ASSETS, symbolQuery), [symbolQuery])

  if (!portfolio) return null

  function handleAdd(): void {
    const quantity = parseFloat(quantityInput)
    const costBasis = parseFloat(costBasisInput)
    if (!selectedSymbol || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(costBasis) || costBasis < 0) {
      return
    }
    addPosition(portfolioId, selectedSymbol.symbol, quantity, costBasis)
    setSymbolQuery('')
    setSelectedSymbol(null)
    setQuantityInput('')
    setCostBasisInput('')
  }

  return (
    <div className="portfolio-pane" role="group" aria-label={portfolio.name}>
      <div className="portfolio-pane-header">
        <h3 className="portfolio-pane-name">{portfolio.name}</h3>
        <div className="portfolio-pane-header-actions">
          <ExportReportButton
            portfolioName={portfolio.name}
            rows={rows}
            stats={risk.stats ?? ZERO_RISK_STATS}
            classBreakdown={classBreakdown}
          />
          <Tooltip label={t('common.close') ?? ''}>
            <button className="icon-btn" onClick={onClose} aria-label={t('common.close') ?? undefined}>
              <IconClose size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="portfolio-pane-body">
        <div className="portfolio-add">
          <div className="portfolio-add-field portfolio-add-symbol">
            <input
              type="text"
              placeholder={t('portfolio.symbolPlaceholder') ?? undefined}
              value={selectedSymbol ? selectedSymbol.symbol : symbolQuery}
              onChange={(e) => {
                setSelectedSymbol(null)
                setSymbolQuery(e.target.value)
              }}
            />
            {matches.length > 0 && !selectedSymbol && (
              <div className="portfolio-add-results">
                {matches.map((a) => (
                  <button
                    key={a.symbol}
                    onClick={() => {
                      setSelectedSymbol(a)
                      quantityInputRef.current?.focus()
                    }}
                  >
                    <span className="sr-sym">{a.symbol}</span>
                    <span className="sr-name">{a.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            ref={quantityInputRef}
            className="portfolio-add-field"
            type="number"
            placeholder={t('portfolio.quantityPlaceholder') ?? undefined}
            min="0"
            step="any"
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
          />
          <input
            className="portfolio-add-field"
            type="number"
            placeholder={t('portfolio.costBasisPlaceholder') ?? undefined}
            min="0"
            step="any"
            value={costBasisInput}
            onChange={(e) => setCostBasisInput(e.target.value)}
          />
          <button className="portfolio-add-btn" onClick={handleAdd}>
            {t('portfolio.addBtn')}
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="portfolio-empty">{t('portfolio.emptyState')}</div>
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

            {tab === 'holdings' ? (
              <>
                <div className="portfolio-summary">
                  <div className="portfolio-summary-tile">
                    <div className="lbl">{t('portfolio.marketValue')}</div>
                    <div className="val tnum">
                      ${totals.marketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="portfolio-summary-tile">
                    <div className="lbl">{t('portfolio.costBasis')}</div>
                    <div className="val tnum">
                      ${totals.costTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className={'portfolio-summary-tile ' + (totals.pnl >= 0 ? 'up' : 'down')}>
                    <div className="lbl">{t('portfolio.unrealizedPnl')}</div>
                    <div className="val tnum">
                      {totals.pnl >= 0 ? '+' : ''}
                      ${totals.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} (
                      {totals.pnl >= 0 ? '+' : ''}
                      {totals.pnlPct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <HoldingsTable rows={rows} onRemove={(sym) => removePosition(portfolioId, sym)} />
              </>
            ) : (
              <PortfolioDashboardTab rows={rows} risk={risk} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
