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
import HoldingChartCard from '@renderer/components/portfolio/HoldingChartCard'
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

// How many holding-chart cards the 'charts' tab mounts up front — each one is a real
// lightweight-charts instance (via PriceChart), not a free DOM node, so a portfolio with many
// holdings must not silently mount one per row. Mirrors HoldingsRankBar's own
// show-top-N/show-all toggle (same dashboard tab, same "don't render everything at once by
// default" instinct) rather than the asset browser's page-number pagination, since cards stay
// mounted once revealed (no need to page back and forth) and a typical portfolio's holding
// count (a handful to a few dozen) is small enough that "show more" beats real pagination.
const CHARTS_INITIAL_COUNT = 6

export default function PortfolioPane({
  portfolioId,
  onClose
}: {
  portfolioId: string
  onClose: () => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const { portfolios, addPosition, removePosition, renamePortfolio, deletePortfolio, selectSymbol } = useAppState()
  const portfolio = portfolios.find((p) => p.id === portfolioId)

  const [symbolQuery, setSymbolQuery] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<Asset | null>(null)
  const [quantityInput, setQuantityInput] = useState('')
  const [costBasisInput, setCostBasisInput] = useState('')
  const quantityInputRef = useRef<HTMLInputElement | null>(null)

  const [tab, setTab] = useState<'holdings' | 'dashboard' | 'charts'>('holdings')
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameTaken, setNameTaken] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [chartsExpanded, setChartsExpanded] = useState(false)

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

  const visibleChartRows = chartsExpanded ? rows : rows.slice(0, CHARTS_INITIAL_COUNT)
  const canExpandCharts = rows.length > CHARTS_INITIAL_COUNT

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

  function startRename(): void {
    setNameDraft(portfolio!.name)
    setNameTaken(false)
    setRenaming(true)
  }

  function commitRename(): void {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === portfolio!.name) {
      setRenaming(false)
      setNameTaken(false)
      return
    }
    if (renamePortfolio(portfolioId, trimmed)) {
      setRenaming(false)
      setNameTaken(false)
    } else {
      setNameTaken(true)
    }
  }

  // Deleting the portfolio this pane is showing must not leave the pane open on a portfolio
  // that no longer exists. deletePortfolio() already drops portfolioId out of openPortfolioIds
  // (see AppStateContext), which alone would make PortfolioWorkspace stop rendering this pane —
  // onClose() is called too so this stays correct even if that internal wiring ever changes,
  // and matches the instruction to close (not auto-switch to another portfolio), same as
  // CustomizePanel's own delete button does today.
  function handleDelete(): void {
    deletePortfolio(portfolioId)
    onClose()
  }

  return (
    <div className="portfolio-pane" role="group" aria-label={portfolio.name}>
      <div className="portfolio-pane-header">
        <div className="portfolio-pane-name-wrap">
          {renaming ? (
            <input
              className="portfolio-pane-name-input"
              value={nameDraft}
              autoFocus
              onChange={(e) => {
                setNameDraft(e.target.value)
                setNameTaken(false)
              }}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setRenaming(false)
                  setNameTaken(false)
                }
              }}
            />
          ) : (
            <Tooltip label={t('portfolio.renamePortfolio') ?? ''}>
              <button
                className="portfolio-pane-name"
                onClick={startRename}
                aria-label={t('portfolio.renamePortfolio') ?? undefined}
              >
                {portfolio.name}
              </button>
            </Tooltip>
          )}
          {nameTaken && <span className="portfolio-pane-rename-error">{t('customize.portfolioNameTaken')}</span>}
        </div>
        <div className="portfolio-pane-header-actions">
          <ExportReportButton
            portfolioName={portfolio.name}
            rows={rows}
            stats={risk.stats ?? ZERO_RISK_STATS}
            classBreakdown={classBreakdown}
          />
          {confirmingDelete ? (
            <button
              className="portfolio-pane-delete-confirm"
              onClick={handleDelete}
              onBlur={() => setConfirmingDelete(false)}
            >
              {t('customize.confirmDelete')}
            </button>
          ) : (
            <Tooltip label={t('customize.deletePortfolio') ?? ''}>
              <button
                className="icon-btn portfolio-pane-delete-btn"
                onClick={() => setConfirmingDelete(true)}
                aria-label={t('customize.deletePortfolio') ?? undefined}
              >
                <IconClose size={13} />
              </button>
            </Tooltip>
          )}
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
              <button className={tab === 'charts' ? 'active' : ''} onClick={() => setTab('charts')}>
                {t('portfolio.dashboard.tabCharts')}
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
            ) : tab === 'dashboard' ? (
              <PortfolioDashboardTab rows={rows} risk={risk} />
            ) : (
              <div className="portfolio-charts-tab">
                <div className="portfolio-charts-grid">
                  {visibleChartRows.map((row) => (
                    <HoldingChartCard
                      key={row.asset.symbol}
                      row={row}
                      onSelect={() => {
                        selectSymbol(row.asset)
                        onClose()
                      }}
                    />
                  ))}
                </div>
                {canExpandCharts && (
                  <button className="holdings-rank-toggle" onClick={() => setChartsExpanded((v) => !v)}>
                    {chartsExpanded
                      ? t('portfolio.dashboard.showTopBtn', { n: CHARTS_INITIAL_COUNT })
                      : t('portfolio.dashboard.showAllBtn', { count: rows.length })}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
